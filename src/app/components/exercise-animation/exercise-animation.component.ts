import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-exercise-animation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animation-container">
      <!-- Saccades -->
      <div *ngIf="exerciseId === 'saccades'" class="saccades-animation">
        <div class="person">
          <div class="head">
            <div class="eyes">
              <div class="eye left">
                <div class="pupil"></div>
              </div>
              <div class="eye right">
                <div class="pupil"></div>
              </div>
            </div>
          </div>
          <div class="body"></div>
          <div class="arms">
            <div class="arm left-arm">
              <div class="finger">👈</div>
            </div>
            <div class="arm right-arm">
              <div class="finger">👉</div>
            </div>
          </div>
        </div>
        <div class="instruction">Move eyes quickly between fingers</div>
      </div>

      <!-- VOR Left/Right -->
      <div *ngIf="exerciseId === 'vor_lr'" class="vor-lr-animation">
        <div class="person rotating-lr">
          <div class="head">
            <div class="eyes">
              <div class="eye left">
                <div class="pupil fixed"></div>
              </div>
              <div class="eye right">
                <div class="pupil fixed"></div>
              </div>
            </div>
          </div>
          <div class="body"></div>
          <div class="single-arm">
            <div class="finger-target">👆</div>
          </div>
        </div>
        <div class="instruction">Rotate head left ↔ right, eyes on finger</div>
      </div>

      <!-- VOR Up/Down -->
      <div *ngIf="exerciseId === 'vor_ud'" class="vor-ud-animation">
        <div class="person rotating-ud">
          <div class="head">
            <div class="eyes">
              <div class="eye left">
                <div class="pupil fixed"></div>
              </div>
              <div class="eye right">
                <div class="pupil fixed"></div>
              </div>
            </div>
          </div>
          <div class="body"></div>
          <div class="single-arm">
            <div class="finger-target">👆</div>
          </div>
        </div>
        <div class="instruction">Nod head up ↕ down, eyes on finger</div>
      </div>

      <!-- VMS -->
      <div *ngIf="exerciseId === 'vms'" class="vms-animation">
        <div class="person-vms rotating-trunk">
          <div class="head">
            <div class="eyes">
              <div class="eye left">
                <div class="pupil fixed"></div>
              </div>
              <div class="eye right">
                <div class="pupil fixed"></div>
              </div>
            </div>
          </div>
          <div class="body"></div>
          <div class="extended-arm">
            <div class="thumb-target">👍</div>
          </div>
        </div>
        <div class="instruction">Rotate arm & trunk together, eyes on thumb</div>
      </div>

      <!-- Convergence -->
      <div *ngIf="exerciseId === 'convergence'" class="convergence-animation">
        <div class="person">
          <div class="head">
            <div class="eyes">
              <div class="eye left">
                <div class="pupil converging"></div>
              </div>
              <div class="eye right">
                <div class="pupil converging"></div>
              </div>
            </div>
          </div>
          <div class="body"></div>
        </div>
        <div class="moving-finger">👆</div>
        <div class="instruction">Move finger towards nose, stop at double vision</div>
      </div>
    </div>
  `,
  styles: [`
    .animation-container {
      padding: 2rem 1rem 3.5rem 1rem;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(236, 72, 153, 0.05));
      border-radius: 16px;
      margin: 1rem 0;
      min-height: 200px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .person {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .head {
      width: 60px;
      height: 70px;
      background: #ffd4a3;
      border-radius: 30px 30px 40px 40px;
      position: relative;
      margin-bottom: 5px;
    }

    .eyes {
      position: absolute;
      top: 25px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 15px;
    }

    .eye {
      width: 12px;
      height: 12px;
      background: white;
      border-radius: 50%;
      border: 2px solid #333;
      position: relative;
      overflow: hidden;
    }

    .pupil {
      width: 6px;
      height: 6px;
      background: #333;
      border-radius: 50%;
      position: absolute;
      top: 3px;
      left: 3px;
    }

    .body {
      width: 40px;
      height: 60px;
      background: #6366f1;
      border-radius: 20px 20px 0 0;
    }

    /* Arms for Saccades */
    .arms {
      position: absolute;
      top: 50%;
      width: 200px;
      display: flex;
      justify-content: space-between;
    }

    .arm {
      position: absolute;
    }

    .left-arm {
      left: -80px;
      animation: wiggle-left 3s ease-in-out infinite;
    }

    .right-arm {
      right: -80px;
      animation: wiggle-right 3s ease-in-out infinite;
    }

    .finger {
      font-size: 2rem;
    }

    @keyframes wiggle-left {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    @keyframes wiggle-right {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(10px); }
    }

    /* Saccades - Eye Movement */
    .saccades-animation .pupil {
      animation: saccade-movement 2s ease-in-out infinite;
    }

    @keyframes saccade-movement {
      0%, 40% { transform: translateX(-3px); }
      50%, 90% { transform: translateX(3px); }
      100% { transform: translateX(-3px); }
    }

    /* VOR Left/Right */
    .vor-lr-animation .person {
      animation: head-rotate-lr 3s ease-in-out infinite;
    }

    @keyframes head-rotate-lr {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-25deg); }
      75% { transform: rotate(25deg); }
    }

    /* VOR Up/Down */
    .vor-ud-animation .person {
      animation: head-rotate-ud 3s ease-in-out infinite;
    }

    @keyframes head-rotate-ud {
      0%, 100% { transform: rotateX(0deg); }
      25% { transform: rotateX(15deg); }
      75% { transform: rotateX(-15deg); }
    }

    .single-arm {
      position: absolute;
      right: -60px;
      top: 30px;
    }

    .finger-target {
      font-size: 2rem;
      animation: pulse 2s ease-in-out infinite;
    }

    /* VMS - Trunk Rotation */
    .person-vms {
      animation: trunk-rotate 4s ease-in-out infinite;
    }

    @keyframes trunk-rotate {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-30deg); }
      75% { transform: rotate(30deg); }
    }

    .extended-arm {
      position: absolute;
      right: -70px;
      top: 20px;
    }

    .thumb-target {
      font-size: 2rem;
      animation: pulse 2s ease-in-out infinite;
    }

    /* Convergence */
    .moving-finger {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 2.5rem;
      animation: move-to-nose 3s ease-in-out infinite;
    }

    @keyframes move-to-nose {
      0% { transform: translate(-50%, -50%) translateX(80px) scale(0.8); }
      50% { transform: translate(-50%, -50%) translateX(0px) scale(1.2); }
      100% { transform: translate(-50%, -50%) translateX(80px) scale(0.8); }
    }

    .pupil.converging {
      animation: converge-pupils 3s ease-in-out infinite;
    }

    @keyframes converge-pupils {
      0% { transform: translateX(2px); }
      50% { transform: translateX(-2px); }
      100% { transform: translateX(2px); }
    }

    .pupil.fixed {
      left: 3px;
      animation: none;
    }

    .instruction {
      position: absolute;
      bottom: 0.75rem;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 0.875rem;
      color: var(--text-muted);
      font-weight: 600;
      padding: 0 1rem;
      z-index: 10;
    }

    @media (max-width: 640px) {
      .animation-container {
        min-height: 160px;
        padding: 1.5rem 1rem 3rem 1rem;
      }

      .head {
        width: 50px;
        height: 60px;
      }

      .body {
        width: 35px;
        height: 50px;
      }

      .instruction {
        font-size: 0.75rem;
        bottom: 0.5rem;
      }
    }
  `]
})
export class ExerciseAnimationComponent {
  @Input() exerciseId: string = '';
}

