import { inject, Injectable } from '@angular/core';
import { FirebaseStorageService } from './firebase-storage.service';
import { RealtimeDatabaseService } from './realtime-database.service';
import { useFirebaseEmulators } from './firebase-emulators';

export type MediaKind = 'book' | 'panorama';
export interface MediaAsset {
  id: string;
  kind: MediaKind;
  title: string;
  description: string;
  url?: string;
  storagePath?: string;
  attribution?: string;
}

export const DEMO_MEDIA: readonly MediaAsset[] = [
  { id: 'demo-book', kind: 'book', title: 'Cuốn sách thử nghiệm',
    description: 'PDF mẫu để thử lật trang. Đây không phải tài liệu học tập Đồng Nai.',
    url: '/demo/tracemonkey.pdf', attribution: 'Mozilla PDF.js sample: Trace-based Just-in-Time Type Specialization for Dynamic Languages.' },
  { id: 'demo-panorama', kind: 'panorama', title: 'Một chuyến đi 360°',
    description: 'Ảnh toàn cảnh mẫu từ Pannellum, không phải địa điểm ở Đồng Nai.',
    url: '/demo/alma.jpg', attribution: 'ALMA Observatory — Pannellum / Matthew Petroff, CC BY-SA 4.0.' },
];

/** Blaze is enabled by the project owner. Catalogs come from Firebase; emulators remain opt-in. */
export const MEDIA_CLOUD_ENABLED = true;

export function validateMediaRecord(id: string, value: unknown, kind: MediaKind): MediaAsset | null {
  if (!/^[\w-]{1,80}$/.test(id) || !value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (record['kind'] !== kind || record['published'] !== true ||
      typeof record['title'] !== 'string' || !record['title'].trim() || record['title'].length > 120 ||
      typeof record['description'] !== 'string' || record['description'].length > 500 ||
      typeof record['storagePath'] !== 'string' ||
      !new RegExp(`^published/media/${kind}/[\\w-]+\\.(pdf|jpg|png)$`).test(record['storagePath']) ||
      (kind === 'book' && !record['storagePath'].endsWith('.pdf')) ||
      (kind === 'panorama' && record['storagePath'].endsWith('.pdf'))) return null;
  return { id, kind, title: record['title'], description: record['description'],
    storagePath: record['storagePath'],
    attribution: typeof record['attribution'] === 'string' ? record['attribution'].slice(0,500) : undefined };
}

@Injectable({ providedIn: 'root' })
export class MediaLibraryService {
  private readonly storage = inject(FirebaseStorageService);
  private readonly database = inject(RealtimeDatabaseService);
  private readonly catalogs = new Map<MediaKind, Promise<MediaAsset[]>>();
  private readonly urls = new Map<string, Promise<string>>();

  async list(kind: MediaKind): Promise<MediaAsset[]> {
    if (MEDIA_CLOUD_ENABLED || useFirebaseEmulators()) return this.refreshPublished(kind);
    return DEMO_MEDIA.filter(asset => asset.kind === kind);
  }

  /** One bounded query per kind per app session; explicit invalidation after uploads. */
  refreshPublished(kind: MediaKind): Promise<MediaAsset[]> {
    let request = this.catalogs.get(kind);
    if (!request) {
      request = this.readCatalog(kind).catch(error => { this.catalogs.delete(kind); throw error; });
      this.catalogs.set(kind, request);
    }
    return request;
  }

  private async readCatalog(kind: MediaKind): Promise<MediaAsset[]> {
    const { orderByChild, equalTo, limitToFirst } = await import('firebase/database');
    const records = await this.database.read(`media/${kind}`, [orderByChild('published'), equalTo(true), limitToFirst(24)]);
    if (!records || typeof records !== 'object') return [];
    return Object.entries(records).slice(0,24)
      .map(([id, value]) => validateMediaRecord(id, value, kind))
      .filter((asset): asset is MediaAsset => asset !== null);
  }

  resolveUrl(asset: MediaAsset): Promise<string> {
    if (asset.url && DEMO_MEDIA.some(demo => demo.id === asset.id && demo.url === asset.url)) return Promise.resolve(asset.url);
    if (!asset.storagePath || !new RegExp(`^published/media/${asset.kind}/[\\w-]+\\.(pdf|jpg|png)$`).test(asset.storagePath)) {
      return Promise.reject(new Error('Đường dẫn tài liệu không hợp lệ.'));
    }
    const path = asset.storagePath;
    let request = this.urls.get(path);
    if (!request) {
      request = this.storage.getDownloadUrl(path).catch(error => { this.urls.delete(path); throw error; });
      this.urls.set(path, request);
    }
    return request;
  }

  /** Call from an authorized teacher tool; Firebase rules enforce the editor role. */
  async upload(kind: MediaKind, file: File, title: string, description = '', attribution = ''): Promise<MediaAsset> {
    if (!MEDIA_CLOUD_ENABLED && !useFirebaseEmulators()) {
      throw new Error('Tải lên đang tắt. Dùng Firebase Emulator; Cloud Storage cần gói Blaze và quyền giáo viên.');
    }
    if (!title.trim() || title.length > 120 || description.length > 500 || attribution.length > 500) {
      throw new Error('Tên tài liệu tối đa 120 ký tự; mô tả và nguồn tối đa 500 ký tự.');
    }
    const maxBytes = (kind === 'book' ? 10 : 5) * 1024 * 1024;
    if (!file.size || file.size > maxBytes) throw new Error(`Tệp phải nhỏ hơn ${kind === 'book' ? 10 : 5} MiB.`);
    const signature = new Uint8Array(await file.slice(0,8).arrayBuffer());
    let extension: string;
    let contentType: string;
    if (kind === 'book') {
      if (String.fromCharCode(...signature.slice(0,5)) !== '%PDF-') throw new Error('Chọn một tệp PDF hợp lệ.');
      extension = 'pdf'; contentType = 'application/pdf';
    } else {
      const jpeg = signature[0] === 255 && signature[1] === 216 && signature[2] === 255;
      const png = signature.slice(0,8).join(',') === '137,80,78,71,13,10,26,10';
      if (!jpeg && !png) throw new Error('Chọn ảnh JPEG hoặc PNG.');
      const bitmap = await createImageBitmap(file);
      const valid = bitmap.width === bitmap.height * 2 && bitmap.width <= 8192;
      bitmap.close();
      if (!valid) throw new Error('Ảnh 360° cần tỷ lệ 2:1 và chiều rộng tối đa 8192 pixel.');
      extension = jpeg ? 'jpg' : 'png'; contentType = jpeg ? 'image/jpeg' : 'image/png';
    }
    const id = crypto.randomUUID();
    const storagePath = `published/media/${kind}/${id}.${extension}`;
    await this.storage.upload(storagePath, file, { contentType, cacheControl: 'public,max-age=31536000,immutable' });
    const asset: MediaAsset = { id, kind, title: title.trim(), description, storagePath, attribution };
    const record = { ...asset, published: true, size: file.size };
    try {
      await this.database.set(`media/${kind}/${id}`, record);
    } catch (error) {
      // A lost acknowledgement can hide a successful write. Never delete its backing file.
      let observed: unknown;
      try { observed = await this.database.read(`media/${kind}/${id}`); }
      catch { throw new Error(`Không xác nhận được danh mục; giữ tệp để kiểm tra: ${storagePath}`, { cause: error }); }
      const committed = observed && typeof observed === 'object' &&
        Object.entries(record).every(([key, value]) => (observed as Record<string, unknown>)[key] === value);
      if (!committed) {
        if (observed !== null) throw new Error(`Danh mục không khớp; giữ tệp để kiểm tra: ${storagePath}`, { cause: error });
        try { await this.storage.remove(storagePath); }
        catch { throw new Error(`Không lưu được danh mục; tệp cần dọn thủ công: ${storagePath}`, { cause: error }); }
        throw error;
      }
    }
    this.catalogs.delete(kind);
    return asset;
  }
}
