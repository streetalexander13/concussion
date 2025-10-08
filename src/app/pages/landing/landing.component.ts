import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {
  constructor(private router: Router) {}

  tryDemo() {
    this.router.navigate(['/measurement']);
  }

  signUp() {
    this.router.navigate(['/signup']);
  }

  login() {
    this.router.navigate(['/login']);
  }
}
