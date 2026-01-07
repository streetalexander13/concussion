import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DataService } from '../../core/data.service';
import { ExerciseType } from '../../core/models';

type NeckSelection = {
  chinTucks: boolean;
  headTurns: boolean;
  sideTilts: boolean;
};

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.css',
})
export class OnboardingComponent {
  // Core audiovestibular exercises
  saccades = signal(true);
  vorLR = signal(true);
  vorUD = signal(true);
  vms = signal(true);
  convergence = signal(true);

  neck = signal<NeckSelection>({
    chinTucks: false,
    headTurns: false,
    sideTilts: false,
  });

  saving = signal(false);
  error = signal<string | null>(null);

  selectedIds = computed<ExerciseType[]>(() => {
    const ids: ExerciseType[] = [];
    if (this.saccades()) ids.push('saccades');
    if (this.vorLR()) ids.push('vor_lr');
    if (this.vorUD()) ids.push('vor_ud');
    if (this.vms()) ids.push('vms');
    if (this.convergence()) ids.push('convergence');

    const neck = this.neck();
    if (neck.chinTucks) ids.push('neck_chin_tucks_left', 'neck_chin_tucks_right');
    if (neck.headTurns) ids.push('neck_head_turns_left', 'neck_head_turns_right');
    if (neck.sideTilts) ids.push('neck_side_tilts_left', 'neck_side_tilts_right');

    return ids;
  });

  constructor(
    private data: DataService,
    private router: Router,
  ) {}

  toggleAllCore(on: boolean) {
    this.saccades.set(on);
    this.vorLR.set(on);
    this.vorUD.set(on);
    this.vms.set(on);
    this.convergence.set(on);
  }

  updateNeck(partial: Partial<NeckSelection>) {
    this.neck.update((v) => ({ ...v, ...partial }));
  }

  async saveAndContinue(): Promise<void> {
    const selected = this.selectedIds();
    if (selected.length === 0) {
      this.error.set('Please select at least one exercise.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.data.updateExercisePlan({
        hasCompletedOnboarding: true,
        selectedExerciseIds: selected,
      });
      await this.router.navigate(['/start']);
    } catch (e: any) {
      this.error.set(e?.message || 'Could not save your plan. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }
}


