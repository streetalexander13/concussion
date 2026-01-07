import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { FeedbackService } from '../../core/feedback.service';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.css',
})
export class FeedbackComponent {
  name = '';
  email = '';
  message = '';

  loading = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  constructor(
    private feedback: FeedbackService,
    private router: Router,
  ) {}

  async submit(): Promise<void> {
    if (!this.message.trim()) return;

    this.loading.set(true);
    this.success.set(false);
    this.error.set(null);

    try {
      await this.feedback.submitFeedback({
        name: this.name.trim() || undefined,
        email: this.email.trim() || undefined,
        message: this.message.trim(),
        pagePath: this.router.url,
      });

      this.success.set(true);
      this.name = '';
      this.email = '';
      this.message = '';
    } catch (e: any) {
      this.error.set(
        e?.message ||
          'Sorry — we could not send feedback right now. Please email us instead.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}


