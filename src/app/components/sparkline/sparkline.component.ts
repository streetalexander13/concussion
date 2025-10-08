import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.width]="width" [attr.height]="height" [attr.viewBox]="'0 0 ' + width + ' ' + height" class="spark">
      <path [attr.d]="path()" fill="none" stroke="#6c5ce7" stroke-width="2" stroke-linejoin="round" />
      <circle *ngIf="points().length" [attr.cx]="points()[points().length-1].x" [attr.cy]="points()[points().length-1].y" r="3" fill="#6c5ce7" />
    </svg>
  `,
  styleUrl: './sparkline.component.css',
})
export class SparklineComponent {
  @Input() values: number[] = [];
  @Input() width = 240;
  @Input() height = 48;
  @Input() min = 0;
  @Input() max = 10;

  points = computed(() => {
    const vals = this.values || [];
    if (!vals.length) return [] as { x: number; y: number }[];
    const w = this.width;
    const h = this.height;
    const step = vals.length > 1 ? (w - 6) / (vals.length - 1) : 0;
    const range = Math.max(0.0001, this.max - this.min);
    return vals.map((v, i) => {
      const x = 3 + i * step;
      const t = (v - this.min) / range; // 0..1
      const y = h - 3 - t * (h - 6);
      return { x, y };
    });
  });

  path = computed(() => {
    const pts = this.points();
    if (!pts.length) return '';
    return pts.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
  });
}


