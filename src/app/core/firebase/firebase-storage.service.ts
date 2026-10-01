import { inject, Injectable } from '@angular/core';
import type { UploadMetadata } from 'firebase/storage';
import { FirebaseService } from './firebase.service';

@Injectable({ providedIn: 'root' })
export class FirebaseStorageService {
  private readonly firebase = inject(FirebaseService);

  private async reference(path: string) {
    if (!path.replace(/\//g, '').trim()) throw new Error('Provide a non-root Storage path.');
    const [storage, sdk] = await Promise.all([
      this.firebase.getStorage(), import('firebase/storage'),
    ]);
    return { sdk, reference: sdk.ref(storage, path) };
  }

  /** An existing file at this path is overwritten. Use a unique path for new files. */
  async upload(path: string, file: Blob | Uint8Array | ArrayBuffer, metadata?: UploadMetadata) {
    const { sdk, reference } = await this.reference(path);
    const result = await sdk.uploadBytes(reference, file, metadata);
    return { path: result.ref.fullPath, size: result.metadata.size,
      contentType: result.metadata.contentType ?? 'application/octet-stream' };
  }

  async getDownloadUrl(path: string): Promise<string> {
    const { sdk, reference } = await this.reference(path);
    return sdk.getDownloadURL(reference);
  }

  /** Browser downloads require bucket CORS configuration. Default limit: 10 MiB. */
  async download(path: string, maxBytes = 10 * 1024 * 1024): Promise<Blob> {
    const { sdk, reference } = await this.reference(path);
    return sdk.getBlob(reference, maxBytes);
  }

  async remove(path: string): Promise<void> {
    const { sdk, reference } = await this.reference(path);
    await sdk.deleteObject(reference);
  }
}
