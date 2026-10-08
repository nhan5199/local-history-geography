import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MediaLibraryService, type MediaAsset } from '../../../../core/firebase/media-library.service';

@Component({
  selector: 'app-book-list',
  imports: [RouterLink],
  templateUrl: './book-list.html',
  styleUrl: './book-list.scss',
})
export class BookList {
  private readonly library = inject(MediaLibraryService);
  readonly books = signal<MediaAsset[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  constructor() { void this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try { this.books.set(await this.library.list('book')); }
    catch { this.error.set(true); }
    finally { this.loading.set(false); }
  }
}
