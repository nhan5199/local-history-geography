import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MediaLibraryService, type MediaAsset } from '../../../../core/firebase/media-library.service';
import { BookList } from './book-list';

describe('BookList', () => {
  const demo: MediaAsset = {
    id: 'demo-book', kind: 'book', title: 'Sách mẫu', description: 'PDF để thử lật trang.',
  };
  const list = vi.fn<() => Promise<MediaAsset[]>>();

  beforeEach(async () => {
    list.mockReset();
    await TestBed.configureTestingModule({
      imports: [BookList],
      providers: [provideRouter([]), { provide: MediaLibraryService, useValue: { list } }],
    }).compileComponents();
  });

  it('shows books from the media library and links to the selected reader', async () => {
    list.mockResolvedValue([demo]);
    const fixture = TestBed.createComponent(BookList);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.book-card');
    expect(list).toHaveBeenCalledWith('book');
    expect(link?.textContent).toContain('Sách mẫu');
    expect(link?.getAttribute('href')).toBe('/books/demo-book');
  });

  it('offers retry after a catalog error', async () => {
    list.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([demo]);
    const fixture = TestBed.createComponent(BookList);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[role="alert"]')).toBeTruthy();
    page.querySelector<HTMLButtonElement>('.books-state button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.querySelector('.book-card')?.textContent).toContain('Sách mẫu');
  });
});
