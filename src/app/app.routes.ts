import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'map',
    loadComponent: () => import('./features/map/pages/map-page/map-page').then(module => module.MapPage),
    title: 'Bản đồ Đồng Nai · Our Place',
  },
  {
    path: '',
    loadChildren: () => import('./features/lessons/lessons.routes').then(module => module.LESSON_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
