import { Component, Input, OnDestroy, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metronome',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="metronome-widget">
      <div class="metronome-visual" [class.beat]="isBeat()">
        <div class="pulse-circle"></div>
        <div class="bpm-display">{{ bpm() }}</div>
        <div class="bpm-label">BPM</div>
      </div>
      
      <div class="metronome-controls">
        <button type="button" class="bpm-btn" (click)="decreaseBpm()">
          <span>−</span>
        </button>
        <div class="bpm-value">{{ bpm() }}</div>
        <button type="button" class="bpm-btn" (click)="increaseBpm()">
          <span>+</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .metronome-widget {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
      padding: 1.5rem;
      background: rgba(99, 102, 241, 0.05);
      border-radius: 16px;
      margin: 1rem 0;
    }

    .metronome-visual {
      position: relative;
      width: 120px;
      height: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #ec4899);
      transition: transform 0.1s ease-out;
    }

    .metronome-visual.beat {
      transform: scale(1.1);
    }

    .pulse-circle {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      opacity: 0;
    }

    .metronome-visual.beat .pulse-circle {
      animation: pulse-out 0.5s ease-out;
    }

    @keyframes pulse-out {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      100% {
        transform: scale(1.5);
        opacity: 0;
      }
    }

    .bpm-display {
      font-size: 2.5rem;
      font-weight: 800;
      color: white;
      line-height: 1;
      z-index: 1;
    }

    .bpm-label {
      font-size: 0.75rem;
      color: white;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-top: 0.25rem;
      z-index: 1;
    }

    .metronome-controls {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .bpm-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--primary);
      color: white;
      border: none;
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }

    .bpm-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
    }

    .bpm-btn:active {
      transform: scale(0.95);
    }

    .bpm-value {
      min-width: 80px;
      text-align: center;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
    }
  `]
})
export class MetronomeComponent implements OnDestroy {
  @Input() set initialBpm(value: number) {
    this.bpm.set(value);
  }
  
  @Input() set isPlaying(value: boolean) {
    if (value) {
      this.start();
    } else {
      this.stop();
    }
  }
  
  bpm = signal(55);
  isBeat = signal(false);
  
  private interval?: number;
  private audioCtx?: AudioContext;

  constructor() {
  }

  ngOnDestroy() {
    this.stop();
  }

  private initAudioContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (iOS requirement)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  private start() {
    this.stop();
    this.initAudioContext(); // Initialize audio on start
    const intervalMs = Math.floor(60000 / this.bpm());
    
    this.interval = window.setInterval(() => {
      this.beat();
    }, intervalMs);
  }

  private stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  private beat() {
    this.isBeat.set(true);
    this.playSound();
    setTimeout(() => this.isBeat.set(false), 100);
  }

  private playSound() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Resume audio context for iOS/mobile
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.0001;
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      const now = this.audioCtx.currentTime;
      osc.start(now);
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.stop(now + 0.1);
    } catch (e) {
      console.log('Audio playback error:', e);
    }
  }

  increaseBpm() {
    const newBpm = Math.min(120, this.bpm() + 5);
    this.bpm.set(newBpm);
    if (this.isPlaying) {
      this.start();
    }
  }

  decreaseBpm() {
    const newBpm = Math.max(30, this.bpm() - 5);
    this.bpm.set(newBpm);
    if (this.isPlaying) {
      this.start();
    }
  }

  getCurrentBpm(): number {
    return this.bpm();
  }
}

