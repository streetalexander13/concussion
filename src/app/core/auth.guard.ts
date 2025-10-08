import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

// Guard for protected routes - requires authentication
export const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.currentUser()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

// Guard for login/signup pages - redirects if already authenticated
export const guestGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.currentUser()) {
    return true;
  }

  router.navigate(['/start']);
  return false;
};

