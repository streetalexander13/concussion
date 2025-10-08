import { Injectable, signal } from '@angular/core';
import {
  AppState,
  DEFAULT_EXERCISE_SEQUENCE,
  DEFAULT_SETTINGS,
  DaySession,
  ExerciseConfig,
  ExerciseResult,
  ExerciseSession,
  ReminderSettings,
  PersonalizationSettings,
  todayIsoDate,
} from './models';

const STORAGE_KEY = 'concussion_recovery_app_state_v1';

@Injectable({ providedIn: 'root' })
export class DataService {
  private stateSig = signal<AppState>(this.load());

  state = this.stateSig.asReadonly();

  private load(): AppState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { settings: DEFAULT_SETTINGS, sessions: [] };
      return JSON.parse(raw) as AppState;
    } catch {
      return { settings: DEFAULT_SETTINGS, sessions: [] };
    }
  }

  private save(next: AppState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  getOrCreateTodaySession(): DaySession {
    const date = todayIsoDate();
    const existing = this.stateSig().sessions.find(s => s.date === date);
    if (existing) return existing;
    const created: DaySession = {
      date,
      baseline: 0,
      baselineRecordedAt: new Date().toISOString(),
      exercises: DEFAULT_EXERCISE_SEQUENCE.map(e => {
        const cfg = { ...e } as ExerciseConfig;
        if (cfg.id === 'vor_lr') {
          cfg.bpm = this.stateSig().settings.personalization.vorDefaultBpm;
        }
        return { config: cfg } as ExerciseSession;
      }),
    };
    const next: AppState = {
      ...this.stateSig(),
      sessions: [...this.stateSig().sessions, created],
    };
    this.stateSig.set(next);
    this.save(next);
    return created;
  }

  setBaseline(date: string, baseline: number): void {
    const sessions = this.stateSig().sessions.map(s =>
      s.date === date ? { ...s, baseline, baselineRecordedAt: new Date().toISOString() } : s,
    );
    const next = { ...this.stateSig(), sessions };
    this.stateSig.set(next);
    this.save(next);
  }

  recordExerciseResult(date: string, exerciseId: string, result: ExerciseResult, advice?: string): void {
    const sessions = this.stateSig().sessions.map(s => {
      if (s.date !== date) return s;
      const exercises = s.exercises.map(ex =>
        ex.config.id === exerciseId ? { ...ex, result, adviceForNextTime: advice } : ex,
      );
      return { ...s, exercises };
    });
    const next = { ...this.stateSig(), sessions };
    this.stateSig.set(next);
    this.save(next);
  }

  updateVorBpmForNextDay(currentBpm: number, adjustment: 'down5' | 'up5' | 'same'): void {
    const newBpm = adjustment === 'down5' ? currentBpm - 5 : adjustment === 'up5' ? currentBpm + 5 : currentBpm;
    const settings = {
      ...this.stateSig().settings,
      personalization: { ...this.stateSig().settings.personalization, vorDefaultBpm: Math.max(10, newBpm) },
    };
    const next = { ...this.stateSig(), settings };
    this.stateSig.set(next);
    this.save(next);
  }

  updateReminderSettings(partial: Partial<ReminderSettings>): void {
    const current = this.stateSig().settings.reminders;
    const settings = {
      ...this.stateSig().settings,
      reminders: { ...current, ...partial },
    };
    const next = { ...this.stateSig(), settings };
    this.stateSig.set(next);
    this.save(next);
  }

  updatePersonalization(partial: Partial<PersonalizationSettings>): void {
    const current = this.stateSig().settings.personalization;
    const settings = {
      ...this.stateSig().settings,
      personalization: { ...current, ...partial },
    };
    const next = { ...this.stateSig(), settings };
    this.stateSig.set(next);
    this.save(next);
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

  markCompleted(date: string): void {
    const sessions = this.stateSig().sessions.map(s =>
      s.date === date ? { ...s, completedAt: new Date().toISOString() } : s,
    );
    const next = { ...this.stateSig(), sessions };
    this.stateSig.set(next);
    this.save(next);
  }

  getDaySession(date: string): DaySession | undefined {
    return this.stateSig().sessions.find(s => s.date === date);
  }

  getExerciseConfig(exerciseId: string): ExerciseConfig | undefined {
    const today = this.getOrCreateTodaySession();
    return today.exercises.find(e => e.config.id === exerciseId)?.config;
  }
}


