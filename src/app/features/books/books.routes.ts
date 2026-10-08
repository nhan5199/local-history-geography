import type { Routes } from '@angular/router';

export const BOOK_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/book-list/book-list').then(m => m.BookList),
    title: 'Thư viện sách · Our Place',
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/book-reader/book-reader').then(m => m.BookReader),
    title: 'Đọc sách · Our Place',
  },
];
