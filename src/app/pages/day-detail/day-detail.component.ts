import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../core/data.service';
import { SparklineComponent } from '../../components/sparkline/sparkline.component';
import { todayIsoDate } from '../../core/models';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-day-detail',
  standalone: true,
  imports: [CommonModule, SparklineComponent, FormsModule],
  templateUrl: './day-detail.component.html',
  styleUrl: './day-detail.component.css',
})
export class DayDetailComponent {
  date = this.route.snapshot.paramMap.get('date')!;
  session = computed(() => this.data.getDaySession(this.date));
  baselineValues = computed(() => {
    const sessions = [...this.data.state().sessions].sort((a, b) => a.date.localeCompare(b.date));
    return sessions.slice(-14).map(s => s.baseline ?? 0);
  });

  isFutureDate = computed(() => this.date > todayIsoDate());
  hasAnyResults = computed(() => {
    const s = this.session();
    return s?.exercises.some(ex => ex.result) ?? false;
  });

  showManualEntry = signal(false);
  editMode = signal(false);
  manualBaseline = signal(0);
  manualNotes = signal('');
  manualExercises = signal<{
    id: string;
    name: string;
    worsened: boolean;
    severity: number;
  }[]>([
    { id: 'saccades', name: 'Saccades', worsened: false, severity: 0 },
    { id: 'vor_lr', name: 'VOR - Left ↔ Right', worsened: false, severity: 0 },
    { id: 'vor_ud', name: 'VOR - Up ↕ Down', worsened: false, severity: 0 },
    { id: 'vms', name: 'VMS', worsened: false, severity: 0 },
    { id: 'convergence', name: 'Convergence', worsened: false, severity: 0 },
  ]);
  
  // Expose for template
  todayIsoDate = todayIsoDate;

  constructor(
    private route: ActivatedRoute, 
    private data: DataService,
    private router: Router
  ) {}

  toggleManualEntry() {
    this.showManualEntry.update(v => !v);
    this.editMode.set(false);
  }

  startEditMode() {
    const s = this.session();
    if (!s) return;

    // Populate form with existing data
    this.manualBaseline.set(s.baseline ?? 0);
    
    // Populate exercises with existing results
    const exerciseData = [
      { id: 'saccades', name: 'Saccades' },
      { id: 'vor_lr', name: 'VOR - Left ↔ Right' },
      { id: 'vor_ud', name: 'VOR - Up ↕ Down' },
      { id: 'vms', name: 'VMS' },
      { id: 'convergence', name: 'Convergence' },
    ].map(ex => {
      const existingEx = s.exercises.find(e => e.config.id === ex.id);
      return {
        id: ex.id,
        name: ex.name,
        worsened: existingEx?.result?.worsened ?? false,
        severity: existingEx?.result?.severity ?? 0,
      };
    });

    this.manualExercises.set(exerciseData);
    this.editMode.set(true);
    this.showManualEntry.set(true);
  }

  cancelEdit() {
    this.showManualEntry.set(false);
    this.editMode.set(false);
    // Reset to defaults
    this.manualBaseline.set(0);
    this.manualExercises.set([
      { id: 'saccades', name: 'Saccades', worsened: false, severity: 0 },
      { id: 'vor_lr', name: 'VOR - Left ↔ Right', worsened: false, severity: 0 },
      { id: 'vor_ud', name: 'VOR - Up ↕ Down', worsened: false, severity: 0 },
      { id: 'vms', name: 'VMS', worsened: false, severity: 0 },
      { id: 'convergence', name: 'Convergence', worsened: false, severity: 0 },
    ]);
  }

  async saveManualEntry() {
    try {
      // First, ensure a session exists for this date
      // This creates the session with default exercises if it doesn't exist
      await this.data.getOrCreateSessionForDate(this.date);
      
      // Save baseline for this date
      await this.data.setBaseline(this.date, this.manualBaseline());
      
      // Save each exercise result
      const exercises = this.manualExercises();
      for (const ex of exercises) {
        const result = {
          startedAt: new Date(this.date + 'T12:00:00').toISOString(),
          endedAt: new Date(this.date + 'T12:00:30').toISOString(),
          worsened: ex.worsened,
          severity: ex.worsened ? ex.severity : 0,
        };
        await this.data.recordExerciseResult(this.date, ex.id, result);
      }
      
      // Mark as completed
      await this.data.markCompleted(this.date);
      
      // Reset form
      this.manualBaseline.set(0);
      this.manualNotes.set('');
      this.manualExercises.set([
        { id: 'saccades', name: 'Saccades', worsened: false, severity: 0 },
        { id: 'vor_lr', name: 'VOR - Left ↔ Right', worsened: false, severity: 0 },
        { id: 'vor_ud', name: 'VOR - Up ↕ Down', worsened: false, severity: 0 },
        { id: 'vms', name: 'VMS', worsened: false, severity: 0 },
        { id: 'convergence', name: 'Convergence', worsened: false, severity: 0 },
      ]);
      this.showManualEntry.set(false);
      this.editMode.set(false);
      
      // Show success message
      const message = this.editMode() ? 'Exercise data updated successfully!' : 'Exercise data added successfully!';
      alert(message);
    } catch (error) {
      console.error('Error saving manual entry:', error);
      alert('Failed to save exercise data. Please try again.');
    }
  }

  updateExerciseSymptom(index: number, worsened: boolean, severity?: number) {
    this.manualExercises.update(exercises => {
      const updated = [...exercises];
      updated[index] = {
        ...updated[index],
        worsened,
        severity: severity ?? updated[index].severity,
      };
      return updated;
    });
  }

  goToStart() {
    this.router.navigate(['/start']);
  }
}


