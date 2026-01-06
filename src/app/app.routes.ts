import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'feedback',
    loadComponent: () => import('./pages/feedback/feedback.component').then(m => m.FeedbackComponent)
  },
  {
    path: 'measurement',
    loadComponent: () => import('./pages/measurement/measurement.component').then(m => m.MeasurementComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup/signup.component').then(m => m.SignupComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'start',
    loadComponent: () => import('./pages/start/start.component').then(m => m.StartComponent),
    canActivate: [authGuard]
  },
  {
    path: 'track',
    loadComponent: () => import('./pages/track/track.component').then(m => m.TrackComponent),
    canActivate: [authGuard]
  },
  {
    path: 'day/:date',
    loadComponent: () => import('./pages/day-detail/day-detail.component').then(m => m.DayDetailComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '' }
];
