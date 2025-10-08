import { Component, computed, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DEFAULT_EXERCISE_SEQUENCE, ExerciseConfig, todayIsoDate } from '../../core/models';
import { MetronomeComponent } from '../../components/metronome/metronome.component';
import { ExerciseAnimationComponent } from '../../components/exercise-animation/exercise-animation.component';

interface DemoExerciseResult {
  worsened: boolean;
  severity: number;
}

interface DemoExercise {
  config: ExerciseConfig;
  result?: DemoExerciseResult;
}

@Component({
  selector: 'app-measurement',
  standalone: true,
  imports: [CommonModule, MetronomeComponent, ExerciseAnimationComponent],
  templateUrl: './measurement.component.html',
  styleUrl: './measurement.component.css',
})
export class MeasurementComponent {
  @ViewChild(MetronomeComponent) metronome?: MetronomeComponent;
  
  baseline = signal(0);
  step = signal<'baseline' | 'interstitial' | 'exercise' | 'done'>('baseline');
  currentExerciseIndex = signal(0);
  countdown = signal(3);
  timer = signal(30);
  isPaused = signal(false);
  metronomeOn = signal(false);
  currentBpm = signal(55);
  
  // Demo exercises (not saved to database)
  exercises = signal<DemoExercise[]>(
    DEFAULT_EXERCISE_SEQUENCE.map(config => ({ config }))
  );

  currentExercise = computed<ExerciseConfig | null>(() => {
    const exs = this.exercises();
    const i = this.currentExerciseIndex();
    return exs[i]?.config ?? null;
  });

  constructor(private router: Router) {}

  confirmBaseline() {
    this.step.set('interstitial');
  }

  beginExercise() {
    this.step.set('exercise');
    this.countdown.set(3);
    this.timer.set(30);
    const countdownInt = setInterval(() => {
      this.countdown.update(v => v - 1);
      if (this.countdown() <= 0) {
        clearInterval(countdownInt);
        this.startTimer();
      }
    }, 1000);
  }

  private exerciseInterval: any;

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
      this.metronomeOn.set(true);
    }
  }

  restartTimer() {
    this.finishTimer();
    this.startTimer();
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
  }

  recordSymptom(worsened: boolean, severity: number = 0) {
    this.finishTimer();
    
    const result: DemoExerciseResult = {
      worsened,
      severity: worsened ? severity : 0,
    };
    
    // Update demo exercise result
    this.exercises.update(exs => {
      const updated = [...exs];
      updated[this.currentExerciseIndex()] = {
        ...updated[this.currentExerciseIndex()],
        result
      };
      return updated;
    });
    
    const nextIndex = this.currentExerciseIndex() + 1;
    if (nextIndex >= DEFAULT_EXERCISE_SEQUENCE.length) {
      this.step.set('done');
    } else {
      this.currentExerciseIndex.set(nextIndex);
      this.step.set('interstitial');
    }
  }

  repeatExercise() {
    this.step.set('interstitial');
  }

  skipExercise() {
    this.finishTimer();
    
    const nextIndex = this.currentExerciseIndex() + 1;
    if (nextIndex >= DEFAULT_EXERCISE_SEQUENCE.length) {
      this.step.set('done');
    } else {
      this.currentExerciseIndex.set(nextIndex);
      this.step.set('interstitial');
    }
  }

  goToSignup() {
    this.router.navigate(['/signup']);
  }

  ngOnDestroy() {
    this.finishTimer();
  }
}
