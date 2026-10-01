# Firebase read/write examples

Inject `RealtimeDatabaseService` for JSON records and `FirebaseStorageService`
for images/files. Both reuse the application's Firebase initialization and lazy
SDK imports. Failed operations reject with the original Firebase error; live
subscriptions emit errors through RxJS. Database reads return `unknown` (or
`null` for a missing record); validate records before displaying them.

## Try it locally without accounts

The production rule files still deny browser writes. These examples use separate
emulator-only rules allowing access to `samples/`. Do not deploy those rules.

1. Install project dependencies with `npx --yes npm@11.6.2 ci` if needed
   (the lockfile was generated with npm 11).
2. Install the Firebase CLI and its emulator Java prerequisite as described in
   the [Emulator Suite setup](https://firebase.google.com/docs/emulator-suite/install_and_configure).
3. Start the emulators in a terminal at the project root:

   ```powershell
   npx firebase-tools emulators:start --only database,storage --config firebase.emulators.json --project local-history-geography
   ```

4. Run `npm start` in another terminal, then open `http://localhost:4200`.
5. In that page's browser console, run the following and reload **before using
   the services**:

   ```js
   localStorage.setItem('firebase-emulators', 'true');
   location.reload();
   ```

The emulator UI is at `http://127.0.0.1:4000`. Connections are enabled only in
Angular development mode on localhost/127.0.0.1. Production builds always use
the configured cloud project. Local emulator data is temporary unless exported.
To return to cloud reads, remove the localStorage key and reload the page.

## Component usage

For example, in a component at `src/app/features/firebase-samples/sample.ts`:

```ts
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Subscription } from 'rxjs';
import { RealtimeDatabaseService } from '../../core/firebase/realtime-database.service';
import { FirebaseStorageService } from '../../core/firebase/firebase-storage.service';

@Component({
  selector: 'app-firebase-sample',
  template: `
    <button (click)="saveNote()">Save sample note</button>
    <input type="file" (change)="uploadFile($event)" />
    <p>{{ status() }}</p>
  `,
})
export class FirebaseSample {
  private readonly database = inject(RealtimeDatabaseService);
  private readonly storage = inject(FirebaseStorageService);
  private readonly destroyRef = inject(DestroyRef);
  private noteSubscription?: Subscription;
  readonly status = signal('Ready');

  async saveNote() {
    try {
      const id = await this.database.push('samples/notes', {
        title: 'Our town', text: 'The river runs beside the park.',
      });
      const path = `samples/notes/${id}`;
      await this.database.update(path, { title: 'Our local river' });
      const savedNote = await this.database.read(path);
      this.status.set(JSON.stringify(savedNote));

      // Unsubscribes automatically when the component is destroyed.
      this.noteSubscription?.unsubscribe();
      this.noteSubscription = this.database.watch(path).pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: value => this.status.set(JSON.stringify(value)),
          error: error => this.status.set(String(error)),
        });

      // To replace the entire record: await this.database.set(path, { ... });
      // To delete it: await this.database.remove(path);
    } catch (error) {
      this.status.set(String(error));
    }
  }

  async uploadFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      // Unique names avoid accidentally overwriting another file.
      const path = `samples/files/${crypto.randomUUID()}`;
      await this.storage.upload(path, file, {
        contentType: file.type || 'application/octet-stream',
      });
      const url = await this.storage.getDownloadUrl(path);
      this.status.set(url); // Bind this URL to an img src or download link.
      // Optional: await this.storage.download(path); // returns a Blob
      // Optional: await this.storage.remove(path);
    } catch (error) {
      this.status.set(String(error));
    }
  }
}
```

This sample component is documentation, not an exposed upload page. Import it
into a local development page to try it. No live records or files are created
automatically. File upload and database writes are separate operations; if you
save a file's path in a database record, handle partial failures explicitly.

## Existing cloud lesson reads

Use `LessonRepository.getPublishedLessons()` for the published lesson query
allowed by the existing rules. A generic `read('lessons')` is denied under those
rules because it lacks the required publication filter and limit.

To write to the cloud later, add an authorized content-editor flow and matching
Firebase rules, or write through a trusted backend. The public student frontend
does not currently have a write-authorized identity. A web API key is not write
authorization.

Direct Blob downloads require bucket CORS configuration for the site's origin;
see [Firebase download documentation](https://firebase.google.com/docs/storage/web/download-files).
Download URLs can be shared, so treat them according to the file's intended
visibility. See also [database reads/writes](https://firebase.google.com/docs/database/web/read-and-write)
and [Storage uploads](https://firebase.google.com/docs/storage/web/upload-files).
