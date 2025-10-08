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
  DaySession,
  ExerciseConfig,
  ExerciseResult,
  todayIsoDate,
  ReminderSettings,
  PersonalizationSettings,
  StoredDaySession,
  hydrateSession,
  dehydrateSession,
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

  private async loadUserData(userId: string) {
    try {
      // Load settings
      const settingsDoc = await getDoc(doc(db, 'users', userId, 'data', 'settings'));
      const settings = settingsDoc.exists() ? settingsDoc.data() as any : DEFAULT_SETTINGS;

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
          settings: settings,
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
    const created: DaySession = {
      date,
      baseline: 0,
      baselineRecordedAt: new Date(date + 'T12:00:00').toISOString(),
      exercises: DEFAULT_EXERCISE_SEQUENCE.map(e => {
        const cfg = { ...e } as ExerciseConfig;
        if (cfg.id === 'vor_lr') {
          cfg.bpm = this.stateSig().settings.personalization.vorDefaultBpm;
        }
        return { config: cfg };
      }),
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
    advice?: string
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
        return updated;
      }
      return ex;
    });

    await updateDoc(doc(db, 'users', userId, 'sessions', date), {
      exercises: updatedExercises,
    });
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
