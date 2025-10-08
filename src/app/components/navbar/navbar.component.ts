import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  isMenuOpen = false;
  
  isAuthenticated = computed(() => !!this.auth.currentUser());
  userName = computed(() => this.auth.currentUser()?.displayName || 'User');

  constructor(public auth: AuthService, private router: Router) {}

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    this.updateBodyScroll();
  }

  closeMenu() {
    this.isMenuOpen = false;
    this.updateBodyScroll();
  }

  private updateBodyScroll() {
    if (this.isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  async signOut() {
    await this.auth.signOut();
    this.closeMenu();
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
    this.closeMenu();
  }
}
