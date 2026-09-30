import { Injectable } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import { firebaseConfig } from './firebase.config';

/** Application-wide Firebase SDK access; feature repositories own database queries. */
@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private appPromise?: Promise<FirebaseApp>;

  initialize(): Promise<FirebaseApp> {
    return this.appPromise ??= import('firebase/app').then(({ getApps, initializeApp }) =>
      getApps().find(app => app.name === 'local-history-geography') ??
      initializeApp(firebaseConfig, 'local-history-geography'),
    );
  }

  async getDatabase() {
    const [app, { getDatabase }] = await Promise.all([
      this.initialize(),
      import('firebase/database'),
    ]);
    return getDatabase(app, firebaseConfig.databaseURL);
  }

  async getStorage() {
    const [app, { getStorage }] = await Promise.all([
      this.initialize(),
      import('firebase/storage'),
    ]);
    return getStorage(app);
  }

  /** Resolve a public lesson asset, e.g. published/images/town-square.jpg. */
  async getFileUrl(path: string): Promise<string> {
    if (!path.startsWith('published/') || path.length === 'published/'.length) {
      throw new Error('Use a file path within the published/ Storage folder.');
    }
    const [storage, { ref, getDownloadURL }] = await Promise.all([
      this.getStorage(),
      import('firebase/storage'),
    ]);
    return getDownloadURL(ref(storage, path));
  }
}
