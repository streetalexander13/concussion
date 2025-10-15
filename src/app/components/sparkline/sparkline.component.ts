import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sparkline-container">
      <!-- Y-axis label -->
      <div class="y-axis-label">
        <span class="axis-text">Symptom Level</span>
      </div>
      
      <div class="sparkline-wrapper">
        <!-- Y-axis scale -->
        <div class="y-axis">
          <div class="y-tick" *ngFor="let tick of yAxisTicks()">
            <span class="tick-label">{{ tick }}</span>
          </div>
        </div>
        
        <!-- Chart area -->
        <div class="chart-container">
          <svg [attr.width]="width" [attr.height]="height" [attr.viewBox]="'0 0 ' + width + ' ' + height" 
               [attr.preserveAspectRatio]="'xMidYMid meet'" class="spark">
            <!-- Grid lines -->
            <g class="grid">
              <line *ngFor="let tick of yAxisTicks(); let i = index" 
                [attr.x1]="chartPadding" 
                [attr.y1]="getYPosition(tick)" 
                [attr.x2]="width - chartPadding" 
                [attr.y2]="getYPosition(tick)"
                [attr.stroke]="i === 0 ? '#e2e8f0' : '#f1f5f9'"
                stroke-width="1"
                stroke-dasharray="4,4" />
            </g>
            
            <!-- Area fill under line -->
            <path [attr.d]="areaPath()" 
              fill="url(#gradient)" 
              opacity="0.2" />
            
            <!-- Gradient definition -->
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#ec4899;stop-opacity:0.3" />
              </linearGradient>
            </defs>
            
            <!-- Line path -->
            <path [attr.d]="path()" 
              fill="none" 
              stroke="url(#lineGradient)" 
              stroke-width="3" 
              stroke-linejoin="round"
              stroke-linecap="round" />
            
            <!-- Line gradient -->
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#6366f1" />
                <stop offset="100%" style="stop-color:#ec4899" />
              </linearGradient>
            </defs>
            
            <!-- Data points -->
            <g class="data-points">
              <circle *ngFor="let point of points(); let i = index" 
                [attr.cx]="point.x" 
                [attr.cy]="point.y" 
                r="4" 
                fill="white"
                stroke="#6366f1"
                stroke-width="2"
                class="data-point" />
              
              <!-- Last point highlighted -->
              <circle *ngIf="points().length" 
                [attr.cx]="points()[points().length-1].x" 
                [attr.cy]="points()[points().length-1].y" 
                r="6" 
                fill="#6366f1"
                class="last-point" />
            </g>
            
            <!-- Value labels on hover -->
            <g class="value-labels">
              <text *ngFor="let point of points(); let i = index" 
                [attr.x]="point.x" 
                [attr.y]="point.y - 12" 
                text-anchor="middle"
                class="value-label"
                [class.show]="i === points().length - 1">
                {{ values[i] }}
              </text>
            </g>
          </svg>
          
          <!-- X-axis labels -->
          <div class="x-axis">
            <span class="x-label">{{ xAxisStart() }}</span>
            <span class="x-label-center">Time →</span>
            <span class="x-label">{{ xAxisEnd() }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './sparkline.component.css',
})
export class SparklineComponent {
  @Input() values: number[] = [];
  @Input() width = 600;
  @Input() height = 120;
  @Input() min = 0;
  @Input() max = 10;
  
  chartPadding = 40;

  yAxisTicks = computed(() => {
    const ticks = [];
    for (let i = this.max; i >= this.min; i -= 2) {
      ticks.push(i);
    }
    return ticks;
  });

  xAxisStart = computed(() => {
    const count = this.values?.length || 0;
    if (count === 0) return '';
    return count > 1 ? `${count} days ago` : 'Today';
  });

  xAxisEnd = computed(() => {
    return 'Today';
  });

  getYPosition(value: number): number {
    const range = Math.max(0.0001, this.max - this.min);
    const t = (value - this.min) / range;
    return this.height - this.chartPadding - t * (this.height - 2 * this.chartPadding);
  }

  points = computed(() => {
    const vals = this.values || [];
    if (!vals.length) return [] as { x: number; y: number }[];
    const w = this.width;
    const h = this.height;
    const step = vals.length > 1 ? (w - 2 * this.chartPadding) / (vals.length - 1) : 0;
    const range = Math.max(0.0001, this.max - this.min);
    return vals.map((v, i) => {
      const x = this.chartPadding + i * step;
      const t = (v - this.min) / range; // 0..1
      const y = h - this.chartPadding - t * (h - 2 * this.chartPadding);
      return { x, y };
    });
  });

  path = computed(() => {
    const pts = this.points();
    if (!pts.length) return '';
    return pts.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
  });

  areaPath = computed(() => {
    const pts = this.points();
    if (!pts.length) return '';
    const baseline = this.height - this.chartPadding;
    let path = `M ${pts[0].x},${baseline}`;
    pts.forEach(p => {
      path += ` L ${p.x},${p.y}`;
    });
    path += ` L ${pts[pts.length - 1].x},${baseline} Z`;
    return path;
  });
}


