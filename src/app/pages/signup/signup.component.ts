import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  error = signal<string | null>(null);
  loading = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router
  ) {
    // Redirect if already logged in
    if (this.auth.currentUser()) {
      this.router.navigate(['/start']);
    }
  }

  async onSubmit() {
    if (!this.name || !this.email || !this.password || !this.confirmPassword) {
      this.error.set('Please fill in all fields');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    if (this.password.length < 6) {
      this.error.set('Password must be at least 6 characters');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      await this.auth.signUp(this.email, this.password, this.name);
    } catch (err: any) {
      this.error.set(err.message);
      this.loading.set(false);
    }
  }
}

