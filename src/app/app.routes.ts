import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/lessons/lessons.routes').then(module => module.LESSON_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
