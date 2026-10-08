import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaLibraryService, validateMediaRecord } from './media-library.service';
import { FirebaseStorageService } from './firebase-storage.service';
import { RealtimeDatabaseService } from './realtime-database.service';

describe('MediaLibraryService', () => {
  const storage = { getDownloadUrl: vi.fn(), upload: vi.fn(), remove: vi.fn() };
  const database = { read: vi.fn(), set: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.removeItem('firebase-emulators');
    TestBed.configureTestingModule({ providers: [
      { provide: FirebaseStorageService, useValue: storage },
      { provide: RealtimeDatabaseService, useValue: database },
    ] });
  });

  it('reads the Firebase catalog by default and resolves only the selected file', async () => {
    database.read.mockResolvedValue({ a: { kind: 'book', title: 'Book', description: '', published: true, storagePath: 'published/media/book/a.pdf' } });
    storage.getDownloadUrl.mockResolvedValue('https://example.test/book.pdf');
    const service = TestBed.inject(MediaLibraryService);
    const [book] = await service.list('book');
    expect(book.storagePath).toBe('published/media/book/a.pdf');
    expect(database.read).toHaveBeenCalledWith('media/book', expect.any(Array));
    expect(storage.getDownloadUrl).not.toHaveBeenCalled();
    expect(await service.resolveUrl(book)).toBe('https://example.test/book.pdf');
  });

  it('rejects malformed catalog records and paths outside the published kind', () => {
    const value = { kind: 'book', title: 'Book', description: '', published: true, storagePath: 'published/media/book/a.pdf' };
    expect(validateMediaRecord('a', value, 'book')?.id).toBe('a');
    expect(validateMediaRecord('a', { ...value, storagePath: 'published/media/panorama/a.jpg' }, 'book')).toBeNull();
    expect(validateMediaRecord('a', { ...value, published: false }, 'book')).toBeNull();
    expect(validateMediaRecord('a', { ...value, title: 'x'.repeat(121) }, 'book')).toBeNull();
  });

  it('deduplicates bounded cloud catalogs and selected URL lookups', async () => {
    database.read.mockResolvedValue({ a: { kind: 'book', title: 'Book', description: '', published: true, storagePath: 'published/media/book/a.pdf' } });
    storage.getDownloadUrl.mockResolvedValue('https://example.test/book.pdf');
    const service = TestBed.inject(MediaLibraryService);
    const [first, second] = await Promise.all([service.refreshPublished('book'), service.refreshPublished('book')]);
    expect(first).toEqual(second);
    expect(database.read).toHaveBeenCalledTimes(1);
    await Promise.all([service.resolveUrl(first[0]), service.resolveUrl(first[0])]);
    expect(storage.getDownloadUrl).toHaveBeenCalledTimes(1);
  });

  it('rejects oversized uploads before any Storage or database write', async () => {
    const service = TestBed.inject(MediaLibraryService);
    await expect(service.upload('book', { size: 11 * 1024 * 1024 } as File, 'Book')).rejects.toThrow('10 MiB');
    expect(storage.upload).not.toHaveBeenCalled();
    expect(database.set).not.toHaveBeenCalled();
  });

  it('uploads the PDF to Storage and publishes its separate metadata', async () => {
    storage.upload.mockResolvedValue(undefined);
    database.set.mockResolvedValue(undefined);
    const bytes = new TextEncoder().encode('%PDF-1.7');
    const file = { size: bytes.length, slice: () => ({ arrayBuffer: async () => bytes.buffer }) } as unknown as File;
    const service = TestBed.inject(MediaLibraryService);
    const asset = await service.upload('book', file, 'Book');
    expect(storage.upload).toHaveBeenCalledWith(asset.storagePath, file, expect.objectContaining({ contentType: 'application/pdf' }));
    expect(database.set).toHaveBeenCalledWith(`media/book/${asset.id}`, expect.objectContaining({ published: true, size: file.size }));
  });

  it('removes the uploaded file if publishing metadata fails', async () => {
    storage.upload.mockResolvedValue(undefined);
    storage.remove.mockResolvedValue(undefined);
    database.set.mockRejectedValue(new Error('permission denied'));
    database.read.mockResolvedValue(null);
    const bytes = new TextEncoder().encode('%PDF-1.7');
    const file = { size: bytes.length, slice: () => ({ arrayBuffer: async () => bytes.buffer }) } as unknown as File;
    const service = TestBed.inject(MediaLibraryService);
    await expect(service.upload('book', file, 'Book')).rejects.toThrow('permission denied');
    expect(storage.remove).toHaveBeenCalledTimes(1);
  });

  it('preserves an uploaded file if metadata committed but its acknowledgement was lost', async () => {
    storage.upload.mockResolvedValue(undefined);
    database.set.mockImplementation(async (_path, record) => {
      database.read.mockResolvedValue(record);
      throw new Error('lost acknowledgement');
    });
    const bytes = new TextEncoder().encode('%PDF-1.7');
    const file = { size: bytes.length, slice: () => ({ arrayBuffer: async () => bytes.buffer }) } as unknown as File;
    const asset = await TestBed.inject(MediaLibraryService).upload('book', file, 'Book');
    expect(asset.kind).toBe('book');
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('keeps the file for recovery when metadata status cannot be confirmed', async () => {
    storage.upload.mockResolvedValue(undefined);
    database.set.mockRejectedValue(new Error('write failed'));
    database.read.mockRejectedValue(new Error('read failed'));
    const bytes = new TextEncoder().encode('%PDF-1.7');
    const file = { size: bytes.length, slice: () => ({ arrayBuffer: async () => bytes.buffer }) } as unknown as File;
    await expect(TestBed.inject(MediaLibraryService).upload('book', file, 'Book')).rejects.toThrow('giữ tệp');
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
