import { Component, computed, effect, signal, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DataService } from '../../core/data.service';
import { DaySession, DEFAULT_EXERCISE_SEQUENCE, ExerciseConfig, computeNextVorBpm, todayIsoDate } from '../../core/models';
import { MetronomeComponent } from '../../components/metronome/metronome.component';
import { ExerciseAnimationComponent } from '../../components/exercise-animation/exercise-animation.component';

@Component({
  selector: 'app-start',
  standalone: true,
  imports: [CommonModule, MetronomeComponent, ExerciseAnimationComponent],
  templateUrl: './start.component.html',
  styleUrl: './start.component.css',
})
export class StartComponent implements OnDestroy {
  @ViewChild(MetronomeComponent) metronome?: MetronomeComponent;
  
  session = signal<DaySession | null>(null);
  baseline = signal(0);
  step = signal<'baseline' | 'interstitial' | 'exercise' | 'done'>('baseline');
  currentExerciseIndex = signal(0);
  countdown = signal(3);
  timer = signal(30);
  isPaused = signal(false);
  metronomeOn = signal(false);
  metronomeTick = signal(0);
  advice = signal<string | null>(null);
  currentBpm = signal(55);
  loading = signal(true);
  showDosage = signal(false);

  currentExercise = computed<ExerciseConfig | null>(() => {
    const s = this.session();
    const i = this.currentExerciseIndex();
    if (!s) return null;
    return s.exercises[i]?.config ?? null;
  });

  constructor(private data: DataService, private router: Router) {
    // Initialize session asynchronously
    this.initSession();
    
    // Keep session in sync with data changes using allowSignalWrites
    effect(() => {
      const state = this.data.state();
      const today = state.sessions.find(s => s.date === todayIsoDate());
      if (today) {
        this.session.set(today);
        if (!this.baseline()) {
          this.baseline.set(today.baseline ?? 0);
        }
      }
    }, { allowSignalWrites: true });
  }

  async initSession() {
    try {
      this.loading.set(true);
      const s = await this.data.getOrCreateTodaySession();
      this.session.set(s);
      this.baseline.set(s.baseline ?? 0);
      console.log('Session initialized:', s);
    } catch (error) {
      console.error('Error initializing session:', error);
    } finally {
      this.loading.set(false);
    }
  }

  startBaseline() {
    this.step.set('baseline');
  }

  async confirmBaseline() {
    console.log('Confirm baseline clicked', this.baseline());
    
    // Ensure session is loaded
    if (this.loading()) {
      console.log('Still loading, please wait...');
      return;
    }
    
    let s = this.session();
    
    // If no session, try to create it now
    if (!s) {
      console.log('No session found, creating one...');
      try {
        s = await this.data.getOrCreateTodaySession();
        this.session.set(s);
      } catch (error) {
        console.error('Failed to create session:', error);
        return;
      }
    }
    
    if (!s) {
      console.error('Still no session found');
      return;
    }
    
    await this.data.setBaseline(s.date, this.baseline());
    this.step.set('interstitial');
  }

  beginExercise() {
    console.log('Begin exercise clicked');
    const ex = this.currentExercise();
    if (!ex) {
      console.error('No exercise found');
      return;
    }
    
    // Unlock audio context for iOS - must be done synchronously in user gesture handler
    // Metronome is always rendered, so ViewChild should be available
    if (this.metronome) {
      console.log('Unlocking audio...');
      this.metronome.unlockAudio();
    } else {
      console.warn('Metronome not available yet');
    }
    
    this.step.set('exercise');
    this.startCountdown();
  }

  private startCountdown() {
    // Clear any existing countdown
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    this.countdown.set(3);
    this.timer.set(30); // Reset timer
    
    // Play countdown beep immediately for 3
    if (this.metronome) {
      console.log('Playing countdown beep for 3');
      this.metronome.playCountdownBeep();
    } else {
      console.error('Metronome not available for countdown beep');
    }
    
    this.countdownInterval = setInterval(() => {
      this.countdown.update(v => v - 1);
      
      // Play beep for 2 and 1
      if (this.countdown() > 0 && this.metronome) {
        console.log('Playing countdown beep for', this.countdown());
        this.metronome.playCountdownBeep();
      }
      
      if (this.countdown() <= 0) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = undefined;
        // Play start sound when timer begins
        if (this.metronome) {
          console.log('Playing start sound');
          this.metronome.playStartSound();
        }
        this.startTimer();
      }
    }, 1000);
  }

  private metronomeInterval: any;
  private exerciseInterval: any;
  private countdownInterval: any;

  private startTimer() {
    this.timer.set(30);
    this.isPaused.set(false);
    const ex = this.currentExercise();
    if (ex?.hasMetronome) {
      const bpm = ex.bpm ?? 55;
      this.currentBpm.set(bpm);
      this.metronomeOn.set(true);
    }
    this.exerciseInterval = setInterval(() => {
      if (!this.isPaused()) {
        this.timer.update(v => v - 1);
        if (this.timer() <= 0) {
          this.finishTimer();
        }
      }
    }, 1000);
  }

  pauseTimer() {
    this.isPaused.set(true);
    this.metronomeOn.set(false);
  }

  resumeTimer() {
    this.isPaused.set(false);
    const ex = this.currentExercise();
    if (ex?.hasMetronome) {
      // Unlock audio again in case it was suspended
      if (this.metronome) {
        this.metronome.unlockAudio();
      }
      this.metronomeOn.set(true);
    }
  }

  restartTimer() {
    this.finishTimer();
    // Restart with countdown
    this.startCountdown();
  }

  addTime() {
    this.timer.update(v => Math.min(60, v + 10));
  }

  subtractTime() {
    this.timer.update(v => Math.max(5, v - 10));
  }


  private finishTimer() {
    clearInterval(this.exerciseInterval);
    this.metronomeOn.set(false);
    this.isPaused.set(false);
    
    // Play finish sound when timer completes
    if (this.metronome && this.timer() <= 0) {
      console.log('Playing finish sound');
      this.metronome.playFinishSound();
    }
  }

  async recordSymptom(worsened: boolean, severity: number = 0) {
    console.log('Record symptom:', worsened, severity);
    const s = this.session();
    const ex = this.currentExercise();
    if (!s || !ex) {
      console.error('No session or exercise');
      return;
    }

    // Stop any running timers
    this.finishTimer();

    const result = {
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      worsened,
      severity: worsened ? severity : 0,
    };
    let advice: string | undefined;
    if (ex.id === 'saccades') {
      if (severity >= 2) advice = "Next time, don't shift position and take it easier.";
    }
    if (ex.id === 'vor_lr') {
      // Save the user's current BPM if they adjusted it
      const userBpm = this.metronome?.getCurrentBpm() ?? ex.bpm ?? 55;
      const severities = this.data.getRecentExerciseSeverities('vor_lr', 2);
      const nextBpm = computeNextVorBpm([severity, ...severities], userBpm);
      const adj = nextBpm < userBpm ? 'down5' : nextBpm > userBpm ? 'up5' : 'same';
      await this.data.updateVorBpmForNextDay(userBpm, adj);
    }
    await this.data.recordExerciseResult(s.date, ex.id, result, advice);
    
    const nextIndex = this.currentExerciseIndex() + 1;
    if (nextIndex >= DEFAULT_EXERCISE_SEQUENCE.length) {
      await this.data.markCompleted(s.date);
      this.step.set('done');
    } else {
      this.currentExerciseIndex.set(nextIndex);
      this.step.set('interstitial');
    }
  }

  repeatExercise() {
    console.log('Repeat exercise');
    this.step.set('interstitial');
  }

  async skipExercise() {
    console.log('Skip exercise');
    const s = this.session();
    const ex = this.currentExercise();
    if (!s || !ex) return;

    // Stop any running timers
    this.finishTimer();

    // Record as skipped (no symptom worsening)
    const result = {
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      worsened: false,
      severity: 0,
    };
    await this.data.recordExerciseResult(s.date, ex.id, result, 'Skipped');

    const nextIndex = this.currentExerciseIndex() + 1;
    if (nextIndex >= DEFAULT_EXERCISE_SEQUENCE.length) {
      await this.data.markCompleted(s.date);
      this.step.set('done');
    } else {
      this.currentExerciseIndex.set(nextIndex);
      this.step.set('interstitial');
    }
  }

  goToTrack() {
    console.log('Navigate to track');
    this.router.navigate(['/track']);
  }

  toggleDosage() {
    this.showDosage.update(v => !v);
  }

  testAudio() {
    console.log('Testing audio...');
    if (this.metronome) {
      this.metronome.unlockAudio();
      // Play test beep after a tiny delay
      setTimeout(() => {
        if (this.metronome) {
          this.metronome.playCountdownBeep();
        }
      }, 100);
    } else {
      console.error('Metronome not available for test');
    }
  }

  ngOnDestroy() {
    // Clean up all intervals
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    if (this.exerciseInterval) {
      clearInterval(this.exerciseInterval);
    }
    if (this.metronomeInterval) {
      clearInterval(this.metronomeInterval);
    }
  }
}


