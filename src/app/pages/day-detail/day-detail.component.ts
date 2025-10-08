import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../core/data.service';
import { SparklineComponent } from '../../components/sparkline/sparkline.component';

@Component({
  selector: 'app-day-detail',
  standalone: true,
  imports: [CommonModule, SparklineComponent],
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

  constructor(private route: ActivatedRoute, private data: DataService) {}
}


