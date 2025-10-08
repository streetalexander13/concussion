import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'start' },
  {
    path: 'start',
    loadComponent: () => import('./pages/start/start.component').then(m => m.StartComponent)
  },
  {
    path: 'track',
    loadComponent: () => import('./pages/track/track.component').then(m => m.TrackComponent)
  },
  {
    path: 'day/:date',
    loadComponent: () => import('./pages/day-detail/day-detail.component').then(m => m.DayDetailComponent)
  },
  { path: '**', redirectTo: 'start' }
];
