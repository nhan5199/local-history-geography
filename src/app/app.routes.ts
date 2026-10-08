import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'questions',
    loadComponent: () => import('./features/questions/questions-page').then(module => module.QuestionsPage),
    title: 'Câu hỏi ôn tập · Đồng Nai ơi!',
  },
  {
    path: 'games',
    loadComponent: () => import('./features/games/games-page').then(module => module.GamesPage),
    title: 'Sân chơi kiến thức · Đồng Nai ơi!',
  },
  {
    path: 'teacher',
    loadComponent: () => import('./features/questions/teacher-page').then(module => module.TeacherPage),
    title: 'Góc giáo viên · Đồng Nai ơi!',
  },
  {
    path: 'books',
    loadChildren: () => import('./features/books/books.routes').then(module => module.BOOK_ROUTES),
  },
  {
    path: 'panorama',
    loadComponent: () => import('./features/panorama/panorama-page').then(module => module.PanoramaPage),
    title: 'Khám phá 360° · Our Place',
  },
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
