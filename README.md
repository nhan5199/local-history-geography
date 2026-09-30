# Local History & Geography

An account-free Angular 21 frontend for elementary learners, styled with Bootstrap 5.
The bundled lessons are examples, not a verified local curriculum. Replace them with
content for your town or province before using the app in class.

## Run locally

Requires Node.js 22.12+ within the 22.x release line (or another Node version supported
by Angular 21). Created with Node 22.12.0 and npm 10.9.0.

```powershell
cd C:\Users\Nhan\local-history-geography
npm ci
npm start
```

Open http://localhost:4200. No student account is needed. The pages currently use
bundled sample lessons, so they do not depend on database content being available.

The committed lockfile fixes the dependency versions. If npm 10 reports an
`edgesOut` dependency-resolution error when changing packages, use
`npx --yes npm@11.6.2 install` (this does not replace your global npm).

```powershell
npm run build
npm test -- --watch=false
```

Production output: `dist/local-history-geography/browser`. Your web host must rewrite
non-file routes to `index.html` for client-side routing.

## Folder structure

See [the folder tree and architecture guide](docs/project-structure.md) for the
full structure, folder responsibilities, and guidance on adding features.

## Learning companion

Milo is available in the bottom corner on every page. Use Hide/Show, switch corners,
ask a question about a sample lesson, or select Listen to hear an answer. The guide
retrieves lesson passages and includes source links; it is not a generative AI service.
See [companion setup and customization](docs/companion.md) to replace the image/GIF.

## Firebase configuration

Your `local-history-geography` web app configuration is stored in
`src/app/core/firebase/firebase.config.ts`. It uses the supplied Realtime Database
in `asia-southeast1` and the `local-history-geography.firebasestorage.app` bucket.
The Firebase App SDK initializes once during Angular startup. Product SDKs load
when their service methods are used.

- **Realtime Database** stores lesson text and metadata under `/lessons/{lessonId}`.
- **Cloud Storage for Firebase** stores image, PDF, audio, and other file bytes.
- No authentication, account screens, or student uploads are included.

The configuration is installed locally; database connectivity and cloud rules have
not been verified or deployed. The pages still use bundled sample lessons. SDK
initialization does not replace sample content with live database records.

To prepare live content in the [Firebase console](https://console.firebase.google.com/):

1. Publish `firebase/database.rules.json` in Realtime Database's Rules tab and
   `firebase/storage.rules` in Storage's Rules tab. These files are local templates
   until published. Review them against any existing data before deployment.
2. Add lessons under `/lessons/{lessonId}` with `published: true`. The query reader
   returns at most 100 published lessons and matches the indexed `published` field.
3. Upload public lesson files under `published/`, for example
   `published/images/town-square.jpg`. Store that object path in lesson metadata.
4. To replace samples, inject `LessonRepository` from the feature's `data-access`
   folder and call `getPublishedLessons()`. Validate/map each `{ id, data }` record
   to `Lesson` before rendering. `FirebaseService.getFileUrl(path)` resolves media
   paths. Include loading, empty, and error states in the future live-data UI.

The query helper does not upload files or write data. The included rules allow
published-content queries and reading files in `published/`; client writes are
denied. Administer content through the console. Unpublishing a lesson does not
automatically unpublish its files. Keep only public assets in `published/`.

Cloud Storage requires the **Blaze billing plan**; see the
[official Storage setup guide](https://firebase.google.com/docs/storage/web/start).
The Firebase web configuration is public browser configuration; never put a
service-account private key in frontend code.

If you use Firebase CLI, `firebase.json` references both rule files for the project's
default database and Storage bucket. Review and deploy when ready:

```powershell
firebase deploy --only "database,storage" --project local-history-geography
```

## Stack

- Angular 21 with standalone components and client-side routing
- Bootstrap 5 installed through npm
- Firebase modular Web SDK with Realtime Database and Cloud Storage access
- Vitest for unit tests

[Angular docs](https://angular.dev/) ·
[Bootstrap docs](https://getbootstrap.com/docs/5.3/) ·
[Firebase Web setup](https://firebase.google.com/docs/web/setup)
