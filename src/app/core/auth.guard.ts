import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from './auth.service';

// Guard for protected routes - requires authentication
export const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait for Firebase auth to hydrate on initial load/refresh.
  if (auth.loading()) {
    return toObservable(auth.loading).pipe(
      filter((loading) => !loading),
      take(1),
      map(() => (auth.currentUser() ? true : router.parseUrl('/login'))),
    );
  }

  return auth.currentUser() ? true : router.parseUrl('/login');
};

// Guard for login/signup pages - redirects if already authenticated
export const guestGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait for Firebase auth to hydrate on initial load/refresh.
  if (auth.loading()) {
    return toObservable(auth.loading).pipe(
      filter((loading) => !loading),
      take(1),
      map(() => (!auth.currentUser() ? true : router.parseUrl('/start'))),
    );
  }

  return !auth.currentUser() ? true : router.parseUrl('/start');
};

