import type { Routes } from '@angular/router';

export const LESSON_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/lesson-list/lesson-list').then(module => module.LessonList),
    title: 'Đồng Nai ơi! · Cùng khám phá quê hương',
  },
  {
    path: 'lessons/:id',
    loadComponent: () => import('./pages/lesson-detail/lesson-detail').then(module => module.LessonDetail),
    title: 'Lesson · Our Place',
  },
];
