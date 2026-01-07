export type ExerciseType =
  | 'saccades'
  | 'vor_lr'
  | 'vor_ud'
  | 'vms'
  | 'convergence'
  | 'neck_chin_tucks_left'
  | 'neck_chin_tucks_right'
  | 'neck_head_turns_left'
  | 'neck_head_turns_right'
  | 'neck_side_tilts_left'
  | 'neck_side_tilts_right';

export interface ExerciseConfig {
  id: ExerciseType;
  title: string;
  description: string;
  instruction?: string;
  durationSeconds: number;
  hasMetronome?: boolean;
  bpm?: number; // only for metronome-based exercises
}

export interface ExerciseResult {
  startedAt: string; // ISO
  endedAt: string; // ISO
  worsened: boolean;
  severity: number; // 0-9 when worsened, else 0
}

// Lightweight version for Firestore storage
export interface StoredExerciseSession {
  id: ExerciseType; // Just the exercise ID
  bpm?: number; // Only if different from default
  result?: ExerciseResult;
  advice?: string; // Shortened field name
}

export interface StoredDaySession {
  date: string; // YYYY-MM-DD
  baseline: number; // 0-10
  baselineAt: string; // ISO (shortened field name)
  exercises: StoredExerciseSession[];
  completedAt?: string; // ISO when all finished
}

// Full version with config merged in (for app use)
export interface ExerciseSession {
  config: ExerciseConfig;
  result?: ExerciseResult;
  adviceForNextTime?: string;
}

export interface DaySession {
  date: string; // YYYY-MM-DD
  baseline: number; // 0-10
  baselineRecordedAt: string; // ISO
  exercises: ExerciseSession[];
  completedAt?: string; // ISO when all finished
}

export interface ReminderSettings {
  weekdayHour: number; // 0-23
  weekdayMinute: number; // 0-59
  weekendHour: number; // 0-23
  weekendMinute: number; // 0-59
}

export interface PersonalizationSettings {
  vorDefaultBpm: number; // base bpm for VOR
}

export interface ExercisePlanSettings {
  hasCompletedOnboarding: boolean;
  selectedExerciseIds: ExerciseType[]; // ordered
}

export interface AppSettings {
  reminders: ReminderSettings;
  personalization: PersonalizationSettings;
  exercisePlan: ExercisePlanSettings;
}

export interface AppState {
  settings: AppSettings;
  sessions: DaySession[];
}

export function todayIsoDate(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

// Helper to convert stored session to full session with configs
export function hydrateSession(stored: StoredDaySession): DaySession {
  return {
    date: stored.date,
    baseline: stored.baseline,
    baselineRecordedAt: stored.baselineAt,
    exercises: stored.exercises.map(ex => {
      const baseConfig = getExerciseConfig(ex.id);
      if (!baseConfig) {
        throw new Error(`Unknown exercise ID: ${ex.id}`);
      }
      return {
        config: {
          ...baseConfig,
          bpm: ex.bpm ?? baseConfig.bpm, // Use custom BPM if set
        },
        result: ex.result,
        adviceForNextTime: ex.advice,
      };
    }),
    completedAt: stored.completedAt,
  };
}

// Helper to convert full session to lightweight stored format
export function dehydrateSession(session: DaySession): StoredDaySession {
  const stored: StoredDaySession = {
    date: session.date,
    baseline: session.baseline,
    baselineAt: session.baselineRecordedAt,
    exercises: session.exercises.map(ex => {
      const baseConfig = getExerciseConfig(ex.config.id);
      const storedEx: StoredExerciseSession = {
        id: ex.config.id,
      };
      // Only store BPM if it differs from default
      if (ex.config.bpm !== undefined && ex.config.bpm !== baseConfig?.bpm) {
        storedEx.bpm = ex.config.bpm;
      }
      if (ex.result) {
        storedEx.result = ex.result;
      }
      if (ex.adviceForNextTime) {
        storedEx.advice = ex.adviceForNextTime;
      }
      return storedEx;
    }),
  };
  
  // Only add completedAt if it's defined
  if (session.completedAt) {
    stored.completedAt = session.completedAt;
  }
  
  return stored;
}

export const DEFAULT_SETTINGS: AppSettings = {
  reminders: {
    weekdayHour: 8,
    weekdayMinute: 0,
    weekendHour: 9,
    weekendMinute: 30,
  },
  personalization: {
    vorDefaultBpm: 55,
  },
  exercisePlan: {
    // Default selection is the 5 core audiovestibular exercises, but we still
    // require users to confirm via onboarding.
    hasCompletedOnboarding: false,
    selectedExerciseIds: ['saccades', 'vor_lr', 'vor_ud', 'vms', 'convergence'],
  },
};

export const DEFAULT_EXERCISE_SEQUENCE: ExerciseConfig[] = [
  {
    id: 'saccades',
    title: 'Saccades',
    description: 'Hold two arms out and focus on the end of your index finger.',
    instruction: 'Shoot your eyes between each finger, changing position/location every 5-10 repetitions',
    durationSeconds: 30,
    hasMetronome: false,
  },
  {
    id: 'vor_lr',
    title: 'VOR – Left ↔ Right',
    description: 'Hold finger out and focus on it.',
    instruction: 'Rotate your head left to right while focusing on finger',
    durationSeconds: 30,
    hasMetronome: true,
    bpm: 55,
  },
  {
    id: 'vor_ud',
    title: 'VOR – Up ↕ Down',
    description: 'Hold finger out and focus on it.',
    instruction: 'Nod your head up and down while focusing on finger',
    durationSeconds: 30,
    hasMetronome: true,
    bpm: 60,
  },
  {
    id: 'vms',
    title: 'VMS',
    description: 'Hold out thumb with straight arm in standing.',
    instruction: 'Rotate arm and trunk as one unit while focusing on thumb',
    durationSeconds: 30,
    hasMetronome: true,
    bpm: 35,
  },
  {
    id: 'convergence',
    title: 'Convergence',
    description: 'Move finger slowly towards the nose attempting to focus.',
    instruction: 'When you see double, restart',
    durationSeconds: 30,
    hasMetronome: false,
  },
];

export const NECK_EXERCISE_SEQUENCE: ExerciseConfig[] = [
  {
    id: 'neck_chin_tucks_left',
    title: 'Neck: Chin Tucks (Left)',
    description: 'Gently tuck your chin straight back (like making a double chin).',
    instruction: 'Slow, controlled reps. Keep shoulders relaxed.',
    durationSeconds: 30,
    hasMetronome: false,
  },
  {
    id: 'neck_chin_tucks_right',
    title: 'Neck: Chin Tucks (Right)',
    description: 'Gently tuck your chin straight back (like making a double chin).',
    instruction: 'Slow, controlled reps. Keep shoulders relaxed.',
    durationSeconds: 30,
    hasMetronome: false,
  },
  {
    id: 'neck_head_turns_left',
    title: 'Neck: Head Turns (Left)',
    description: 'Turn your head slowly to look over your left shoulder, then return to center.',
    instruction: 'Move within a comfortable range. Avoid sharp pain.',
    durationSeconds: 30,
    hasMetronome: false,
  },
  {
    id: 'neck_head_turns_right',
    title: 'Neck: Head Turns (Right)',
    description: 'Turn your head slowly to look over your right shoulder, then return to center.',
    instruction: 'Move within a comfortable range. Avoid sharp pain.',
    durationSeconds: 30,
    hasMetronome: false,
  },
  {
    id: 'neck_side_tilts_left',
    title: 'Neck: Side Tilts (Left)',
    description: 'Gently tilt your left ear toward your left shoulder, then return to center.',
    instruction: 'Keep shoulders down. Move slowly and comfortably.',
    durationSeconds: 30,
    hasMetronome: false,
  },
  {
    id: 'neck_side_tilts_right',
    title: 'Neck: Side Tilts (Right)',
    description: 'Gently tilt your right ear toward your right shoulder, then return to center.',
    instruction: 'Keep shoulders down. Move slowly and comfortably.',
    durationSeconds: 30,
    hasMetronome: false,
  },
];

export const ALL_EXERCISES: ExerciseConfig[] = [
  ...DEFAULT_EXERCISE_SEQUENCE,
  ...NECK_EXERCISE_SEQUENCE,
];

export function getExerciseConfig(id: ExerciseType): ExerciseConfig | undefined {
  return ALL_EXERCISES.find(e => e.id === id);
}

export function computeNextVorBpm(
  recentSeverities: number[],
  currentBpm: number,
): number {
  // Conditions for progression per provided sample:
  // If 0/10 for 2 days go up by 5 bpm; if 1/10 or 2/10 stay;
  // If > 2/10 go back by 5 bpm.
  if (recentSeverities.length >= 2 && recentSeverities[0] === 0 && recentSeverities[1] === 0) {
    return currentBpm + 5;
  }
  const last = recentSeverities[0] ?? 0;
  if (last > 2) return Math.max(10, currentBpm - 5);
  if (last === 1 || last === 2) return currentBpm;
  return currentBpm; // default
}


