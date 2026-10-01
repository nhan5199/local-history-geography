import { Injectable } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import { firebaseConfig } from './firebase.config';
import { useFirebaseEmulators } from './firebase-emulators';
import type { Database } from 'firebase/database';
import type { FirebaseStorage } from 'firebase/storage';

/** Application-wide Firebase SDK access; feature repositories own database queries. */
@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private appPromise?: Promise<FirebaseApp>;
  private databasePromise?: Promise<Database>;
  private storagePromise?: Promise<FirebaseStorage>;

  initialize(): Promise<FirebaseApp> {
    return this.appPromise ??= import('firebase/app').then(({ getApps, initializeApp }) =>
      getApps().find(app => app.name === 'local-history-geography') ??
      initializeApp(firebaseConfig, 'local-history-geography'),
    );
  }

  getDatabase(): Promise<Database> {
    return this.databasePromise ??= this.createDatabase();
  }

  private async createDatabase(): Promise<Database> {
    const [app, { getDatabase, connectDatabaseEmulator }] = await Promise.all([
      this.initialize(),
      import('firebase/database'),
    ]);
    const database = getDatabase(app, firebaseConfig.databaseURL);
    if (useFirebaseEmulators()) connectDatabaseEmulator(database, '127.0.0.1', 9000);
    return database;
  }

  getStorage(): Promise<FirebaseStorage> {
    return this.storagePromise ??= this.createStorage();
  }

  private async createStorage(): Promise<FirebaseStorage> {
    const [app, { getStorage, connectStorageEmulator }] = await Promise.all([
      this.initialize(),
      import('firebase/storage'),
    ]);
    const storage = getStorage(app);
    if (useFirebaseEmulators()) connectStorageEmulator(storage, '127.0.0.1', 9199);
    return storage;
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
