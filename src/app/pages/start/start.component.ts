import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DataService } from '../../core/data.service';
import { DaySession, DEFAULT_EXERCISE_SEQUENCE, ExerciseConfig, computeNextVorBpm } from '../../core/models';

@Component({
  selector: 'app-start',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './start.component.html',
  styleUrl: './start.component.css',
})
export class StartComponent {
  session = signal<DaySession | null>(null);
  baseline = signal(0);
  step = signal<'baseline' | 'interstitial' | 'exercise' | 'done'>('baseline');
  currentExerciseIndex = signal(0);
  countdown = signal(3);
  timer = signal(30);
  metronomeOn = signal(false);
  metronomeTick = signal(0);
  advice = signal<string | null>(null);

  currentExercise = computed<ExerciseConfig | null>(() => {
    const s = this.session();
    const i = this.currentExerciseIndex();
    if (!s) return null;
    return s.exercises[i]?.config ?? null;
  });

  constructor(private data: DataService, private router: Router) {
    effect(() => {
      const s = this.data.getOrCreateTodaySession();
      this.session.set(s);
      this.baseline.set(s.baseline ?? 0);
    });
  }

  startBaseline() {
    this.step.set('baseline');
  }

  confirmBaseline() {
    const s = this.session();
    if (!s) return;
    this.data.setBaseline(s.date, this.baseline());
    this.step.set('interstitial');
  }

  beginExercise() {
    const ex = this.currentExercise();
    if (!ex) return;
    this.step.set('exercise');
    this.countdown.set(3);
    const countdownInt = setInterval(() => {
      this.countdown.update(v => v - 1);
      if (this.countdown() <= 0) {
        clearInterval(countdownInt);
        this.startTimer();
      }
    }, 1000);
  }

  private metronomeInterval: any;
  private exerciseInterval: any;

  private startTimer() {
    this.timer.set(30);
    const ex = this.currentExercise();
    if (ex?.hasMetronome) {
      const bpm = ex.bpm ?? 55;
      const intervalMs = Math.max(200, Math.floor(60000 / bpm));
      this.metronomeOn.set(true);
      this.startBeep(intervalMs);
    }
    this.exerciseInterval = setInterval(() => {
      this.timer.update(v => v - 1);
      if (this.timer() <= 0) {
        this.finishTimer();
      }
    }, 1000);
  }

  private audioCtx?: AudioContext;
  private startBeep(intervalMs: number) {
    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const scheduleTick = () => {
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(this.audioCtx!.destination);
        const now = this.audioCtx!.currentTime;
        osc.start(now);
        gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        osc.stop(now + 0.1);
        this.metronomeTick.update(v => v + 1);
      };
      scheduleTick();
      this.metronomeInterval = setInterval(scheduleTick, intervalMs);
    } catch {}
  }

  private finishTimer() {
    clearInterval(this.exerciseInterval);
    if (this.metronomeInterval) {
      clearInterval(this.metronomeInterval);
      this.metronomeOn.set(false);
    }
  }

  recordSymptom(worsened: boolean, severity: number = 0) {
    const s = this.session();
    const ex = this.currentExercise();
    if (!s || !ex) return;
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
      const severities = this.data.getRecentExerciseSeverities('vor_lr', 2);
      const nextBpm = computeNextVorBpm([severity, ...severities], ex.bpm ?? 55);
      const adj = nextBpm < (ex.bpm ?? 55) ? 'down5' : nextBpm > (ex.bpm ?? 55) ? 'up5' : 'same';
      this.data.updateVorBpmForNextDay(ex.bpm ?? 55, adj);
    }
    this.data.recordExerciseResult(s.date, ex.id, result, advice);
    const nextIndex = this.currentExerciseIndex() + 1;
    if (nextIndex >= DEFAULT_EXERCISE_SEQUENCE.length) {
      this.data.markCompleted(s.date);
      this.step.set('done');
    } else {
      this.currentExerciseIndex.set(nextIndex);
      this.step.set('interstitial');
    }
  }

  goToTrack() {
    this.router.navigate(['/track']);
  }
}


