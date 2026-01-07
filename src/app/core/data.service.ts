import { Injectable, signal, effect } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase.config';
import { AuthService } from './auth.service';
import {
  AppState,
  DEFAULT_EXERCISE_SEQUENCE,
  DEFAULT_SETTINGS,
  AppSettings,
  DaySession,
  ExerciseConfig,
  ExerciseResult,
  todayIsoDate,
  ReminderSettings,
  PersonalizationSettings,
  StoredDaySession,
  hydrateSession,
  dehydrateSession,
  ExercisePlanSettings,
  ExerciseType,
  getExerciseConfig,
} from './models';

@Injectable({ providedIn: 'root' })
export class DataService {
  private stateSig = signal<AppState>({ settings: DEFAULT_SETTINGS, sessions: [] });
  state = this.stateSig.asReadonly();

  private unsubscribe?: Unsubscribe;
  private currentUserId?: string;

  constructor(private auth: AuthService) {
    // Listen to auth changes and load user data
    effect(() => {
      const user = this.auth.currentUser();
      
      if (user && user.uid !== this.currentUserId) {
        this.currentUserId = user.uid;
        this.loadUserData(user.uid);
      } else if (!user) {
        this.currentUserId = undefined;
        if (this.unsubscribe) {
          this.unsubscribe();
          this.unsubscribe = undefined;
        }
        this.stateSig.set({ settings: DEFAULT_SETTINGS, sessions: [] });
      }
    });
  }

  private mergeSettings(partial: any): AppSettings {
    const src = partial ?? {};
    return {
      reminders: { ...DEFAULT_SETTINGS.reminders, ...(src.reminders ?? {}) },
      personalization: { ...DEFAULT_SETTINGS.personalization, ...(src.personalization ?? {}) },
      exercisePlan: { ...DEFAULT_SETTINGS.exercisePlan, ...(src.exercisePlan ?? {}) },
    };
  }

  private async loadUserData(userId: string) {
    try {
      // Load settings
      const settingsDoc = await getDoc(doc(db, 'users', userId, 'data', 'settings'));
      const settings = settingsDoc.exists()
        ? this.mergeSettings(settingsDoc.data() as any)
        : DEFAULT_SETTINGS;

      // Apply settings immediately (sessions will follow via realtime listener)
      this.stateSig.set({
        settings,
        sessions: this.stateSig().sessions ?? [],
      });

      // Subscribe to sessions in real-time
      const sessionsRef = collection(db, 'users', userId, 'sessions');
      const q = query(sessionsRef, orderBy('date', 'desc'));

      this.unsubscribe = onSnapshot(q, (snapshot) => {
        const sessions: DaySession[] = [];
        snapshot.forEach((docSnap) => {
          // Convert stored lightweight format to full format
          const stored = docSnap.data() as StoredDaySession;
          sessions.push(hydrateSession(stored));
        });

        this.stateSig.set({
          settings: this.stateSig().settings,
          sessions: sessions,
        });
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      this.stateSig.set({ settings: DEFAULT_SETTINGS, sessions: [] });
    }
  }

  async getOrCreateTodaySession(): Promise<DaySession> {
    const userId = this.currentUserId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const date = todayIsoDate();
    return this.getOrCreateSessionForDate(date);
  }

  async getOrCreateSessionForDate(date: string): Promise<DaySession> {
    const userId = this.currentUserId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const existing = this.stateSig().sessions.find(s => s.date === date);

    if (existing) return existing;

    // Create new session
    const planIds =
      this.stateSig().settings.exercisePlan?.selectedExerciseIds?.length
        ? this.stateSig().settings.exercisePlan.selectedExerciseIds
        : DEFAULT_SETTINGS.exercisePlan.selectedExerciseIds;

    const created: DaySession = {
      date,
      baseline: 0,
      baselineRecordedAt: new Date(date + 'T12:00:00').toISOString(),
      exercises: planIds
        .map((id) => {
          const base = getExerciseConfig(id);
          if (!base) return null;
          const cfg = { ...base } as ExerciseConfig;
          if (cfg.id === 'vor_lr') {
            cfg.bpm = this.stateSig().settings.personalization.vorDefaultBpm;
          }
          return { config: cfg };
        })
        .filter((v): v is { config: ExerciseConfig } => v !== null),
    };

    // Save to Firestore in lightweight format
    const storedSession = dehydrateSession(created);
    await setDoc(doc(db, 'users', userId, 'sessions', date), storedSession);

    return created;
  }

  async setBaseline(date: string, baseline: number): Promise<void> {
    const userId = this.currentUserId;
    if (!userId) return;

    await setDoc(doc(db, 'users', userId, 'sessions', date), {
      baseline,
      baselineAt: new Date().toISOString(), // Use shortened field name
    }, { merge: true });
  }

  async recordExerciseResult(
    date: string,
    exerciseId: string,
    result: ExerciseResult,
    advice?: string,
    bpm?: number
  ): Promise<void> {
    const userId = this.currentUserId;
    if (!userId) return;

    const sessionDoc = await getDoc(doc(db, 'users', userId, 'sessions', date));
    if (!sessionDoc.exists()) return;

    const storedSession = sessionDoc.data() as StoredDaySession;
    const updatedExercises = storedSession.exercises.map(ex => {
      if (ex.id === exerciseId) {
        const updated: any = { ...ex, result };
        // Only add advice if it's defined
        if (advice !== undefined) {
          updated.advice = advice;
        }
        // Save the BPM used for this exercise
        if (bpm !== undefined) {
          updated.bpm = bpm;
        }
        return updated;
      }
      return ex;
    });

    await updateDoc(doc(db, 'users', userId, 'sessions', date), {
      exercises: updatedExercises,
    });
  }

  // Get the last used BPM for a specific exercise
  getLastUsedBpm(exerciseId: string): number | undefined {
    const sessions = this.state().sessions;
    
    // Look through sessions in reverse chronological order
    for (let i = sessions.length - 1; i >= 0; i--) {
      const session = sessions[i];
      const exercise = session.exercises.find(ex => ex.config.id === exerciseId);
      
      // If we found this exercise and it has a saved BPM, return it
      if (exercise?.config.bpm !== undefined) {
        return exercise.config.bpm;
      }
    }
    
    return undefined;
  }

  // Check if user should increase BPM based on symptom progression
  shouldIncreaseBpm(exerciseId: string): { shouldIncrease: boolean; message?: string } {
    const sessions = this.state().sessions;
    
    // Need at least 2 days of data
    if (sessions.length < 2) {
      return { shouldIncrease: false };
    }
    
    // Get the last 2 sessions where this exercise was completed
    const completedSessions = sessions
      .filter(s => {
        const ex = s.exercises.find(e => e.config.id === exerciseId);
        return ex?.result !== undefined;
      })
      .slice(-2);
    
    if (completedSessions.length < 2) {
      return { shouldIncrease: false };
    }
    
    // Check if both days had no symptom worsening (0/10 or false)
    const allNoWorsening = completedSessions.every(s => {
      const ex = s.exercises.find(e => e.config.id === exerciseId);
      return ex?.result && (!ex.result.worsened || ex.result.severity === 0);
    });
    
    if (allNoWorsening) {
      return {
        shouldIncrease: true,
        message: '🎉 Great progress! You\'ve had no symptoms for 2 days. Consider increasing speed by 5 BPM.'
      };
    }
    
    return { shouldIncrease: false };
  }

  async updateVorBpmForNextDay(currentBpm: number, adjustment: 'down5' | 'up5' | 'same'): Promise<void> {
    const userId = this.currentUserId;
    if (!userId) return;

    const newBpm =
      adjustment === 'down5' ? currentBpm - 5
      : adjustment === 'up5' ? currentBpm + 5
      : currentBpm;

    const settingsRef = doc(db, 'users', userId, 'data', 'settings');
    const settingsDoc = await getDoc(settingsRef);
    
    const currentSettings = settingsDoc.exists() 
      ? settingsDoc.data() 
      : DEFAULT_SETTINGS;

    const updatedSettings = {
      ...currentSettings,
      personalization: {
        ...currentSettings.personalization,
        vorDefaultBpm: Math.max(10, newBpm),
      },
    };

    await setDoc(settingsRef, updatedSettings);
  }

  async updateReminderSettings(partial: Partial<ReminderSettings>): Promise<void> {
    const userId = this.currentUserId;
    if (!userId) return;

    const settingsRef = doc(db, 'users', userId, 'data', 'settings');
    const settingsDoc = await getDoc(settingsRef);
    
    const currentSettings = settingsDoc.exists() 
      ? settingsDoc.data() 
      : DEFAULT_SETTINGS;

    const updatedSettings = {
      ...currentSettings,
      reminders: { ...currentSettings.reminders, ...partial },
    };

    await setDoc(settingsRef, updatedSettings);
  }

  async updatePersonalization(partial: Partial<PersonalizationSettings>): Promise<void> {
    const userId = this.currentUserId;
    if (!userId) return;

    const settingsRef = doc(db, 'users', userId, 'data', 'settings');
    const settingsDoc = await getDoc(settingsRef);
    
    const currentSettings = settingsDoc.exists() 
      ? settingsDoc.data() 
      : DEFAULT_SETTINGS;

    const updatedSettings = {
      ...currentSettings,
      personalization: { ...currentSettings.personalization, ...partial },
    };

    await setDoc(settingsRef, updatedSettings);
  }

  async updateExercisePlan(plan: ExercisePlanSettings): Promise<void> {
    const userId = this.currentUserId;
    if (!userId) return;

    const settingsRef = doc(db, 'users', userId, 'data', 'settings');
    const settingsDoc = await getDoc(settingsRef);

    const currentSettings = settingsDoc.exists()
      ? this.mergeSettings(settingsDoc.data())
      : DEFAULT_SETTINGS;

    const updatedSettings: AppSettings = {
      ...currentSettings,
      exercisePlan: {
        ...currentSettings.exercisePlan,
        hasCompletedOnboarding: plan.hasCompletedOnboarding,
        // Ensure stored IDs are valid ExerciseType values at compile-time.
        selectedExerciseIds: [...(plan.selectedExerciseIds as ExerciseType[])],
      },
    };

    await setDoc(settingsRef, updatedSettings);

    // Keep app state in sync without requiring a full reload.
    this.stateSig.set({
      settings: updatedSettings,
      sessions: this.stateSig().sessions,
    });
  }

  getRecentExerciseSeverities(exerciseId: string, limit: number): number[] {
    const severities: number[] = [];
    const sorted = [...this.stateSig().sessions].sort((a, b) => b.date.localeCompare(a.date));
    
    for (const s of sorted) {
      const ex = s.exercises.find(e => e.config.id === exerciseId);
      if (ex?.result) severities.push(ex.result.severity);
      if (severities.length >= limit) break;
    }
    
    return severities;
  }

  async markCompleted(date: string): Promise<void> {
    const userId = this.currentUserId;
    if (!userId) return;

    await setDoc(doc(db, 'users', userId, 'sessions', date), {
      completedAt: new Date().toISOString(),
    }, { merge: true });
  }

  getDaySession(date: string): DaySession | undefined {
    return this.stateSig().sessions.find(s => s.date === date);
  }

  getExerciseConfig(exerciseId: string): ExerciseConfig | undefined {
    const today = this.stateSig().sessions.find(s => s.date === todayIsoDate());
    return today?.exercises.find(e => e.config.id === exerciseId)?.config;
  }
}
