import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email = '';
  password = '';
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
    if (!this.email || !this.password) {
      this.error.set('Please fill in all fields');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      await this.auth.signIn(this.email, this.password);
    } catch (err: any) {
      this.error.set(err.message);
      this.loading.set(false);
    }
  }
}

