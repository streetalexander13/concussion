import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { DaySession, todayIsoDate } from '../../core/models';
import { ScheduleService } from '../../core/schedule.service';
import { SparklineComponent } from '../../components/sparkline/sparkline.component';

function toDateOnly(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

@Component({
  selector: 'app-track',
  standalone: true,
  imports: [CommonModule, RouterLink, SparklineComponent],
  templateUrl: './track.component.html',
  styleUrl: './track.component.css',
})
export class TrackComponent {
  sessions = computed(() => this.data.state().sessions);
  monthStart = signal(new Date());

  constructor(private data: DataService, private router: Router, private schedule: ScheduleService) {}

  daysInMonth(): { date: string; completed: boolean; time?: string }[] {
    const d = new Date(this.monthStart());
    d.setDate(1);
    const month = d.getMonth();
    const results: { date: string; completed: boolean; time?: string }[] = [];
    while (d.getMonth() === month) {
      const dateStr = d.toISOString().slice(0, 10);
      const s = this.sessions().find(s => s.date === dateStr);
      results.push({
        date: dateStr,
        completed: !!s?.completedAt,
        time: s?.completedAt ? new Date(s.completedAt).toLocaleTimeString() : undefined,
      });
      d.setDate(d.getDate() + 1);
    }
    return results;
  }

  goPrevMonth() {
    const d = new Date(this.monthStart());
    d.setMonth(d.getMonth() - 1);
    this.monthStart.set(d);
  }
  goNextMonth() {
    const d = new Date(this.monthStart());
    d.setMonth(d.getMonth() + 1);
    this.monthStart.set(d);
  }

  startToday() {
    this.router.navigate(['/start']);
  }

  onTimeChange(event: Event, weekend: boolean) {
    const value = (event.target as HTMLInputElement).value; // "HH:MM"
    const [h, m] = value.split(':').map(v => parseInt(v, 10));
    if (Number.isFinite(h) && Number.isFinite(m)) {
      if (weekend) this.data.updateReminderSettings({ weekendHour: h, weekendMinute: m });
      else this.data.updateReminderSettings({ weekdayHour: h, weekdayMinute: m });
    }
  }

  async enableReminders() {
    const perm = await this.schedule.requestPermission();
    if (perm === 'granted') this.schedule.scheduleNextReminder();
  }

  baselineValues(): number[] {
    // last 14 days baseline values (0-10)
    const sessions = [...this.sessions()].sort((a, b) => a.date.localeCompare(b.date));
    const vals = sessions.slice(-14).map(s => s.baseline ?? 0);
    return vals;
  }
}


