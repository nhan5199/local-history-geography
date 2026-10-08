# Books and 360° media

`/books` lists books and opens rendered PDF pages in a flipbook. `/panorama` displays an equirectangular image on a sphere. Normal navigation now reads Firebase catalogs and resolves selected Storage files. Demos bundled under `public/demo` are publishing sources. The sample PDF is Mozilla PDF.js's academic paper, not local primary-school curriculum. The panorama is Pannellum's ALMA Observatory example, not Đồng Nai.

## Firebase usage and cost

[Cloud Storage requires Blaze](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024), including default buckets. This project now uses Blaze. Keep large binary data in Storage and metadata in Realtime Database; never put base64 PDFs or images in the database.

Blaze has no-cost allowances, but they depend on bucket location and usage. The bucket name ends in `.firebasestorage.app`; do not assume legacy bucket allowances apply. Client caps and caching reduce usage but do not set a project-wide spending limit. Billing alerts do not stop charges.

## Service usage

Inject `MediaLibraryService` from `src/app/core/firebase/media-library.service.ts`:

```ts
const books = await media.list('book');
const url = await media.resolveUrl(books[0]); // Only resolve selected assets.
const uploaded = await media.upload('book', pdfFile, 'Tên sách', 'Mô tả', 'Nguồn / giấy phép');
const panoramas = await media.list('panorama');
```

The service validates PDF signatures and JPEG/PNG signatures; panorama images must have a 2:1 ratio and width no greater than 8192 pixels. PDF uploads are limited to 10 MiB, panoramas to 5 MiB. Database catalogs are limited to 24 records per kind, queried once per app session. Files are immutable UUID paths and metadata is separate. Failed metadata writes are checked before cleanup: confirmed absent records allow file removal; committed records retain their file; uncertain states preserve the file for recovery. No polling or student upload UI is exposed.

## Local uploads without billing

Follow `docs/firebase-services.md` to start the emulators and opt in using `localStorage.setItem('firebase-emulators', 'true')`, then reload. The media upload service and pages use the emulators in development on localhost only. Empty emulator catalogs show empty states until seeded. Emulator rules permit media writes for local testing; **never deploy emulator rules**.

## Publish the bundled demos to Firebase

On 2026-10-07, the owner approved creating the default bucket near Vietnam.
`local-history-geography.firebasestorage.app` was created in Singapore
(`asia-southeast1`), matching the database region. The production database indexes
and Storage rules are deployed, and both demo assets and their catalog records are
published. CORS covers localhost/127.0.0.1 on port 4200 and the local QA origin
`http://127.0.0.1:4300`. Add the deployed website's real origin before testing there.
Singapore uses regional Storage pricing rather than the US-only Always Free tier.

The publisher targets only the `local-history-geography` project and the two checked-in files in `public/demo`. It writes `published/media/book/demo-book.pdf` and `published/media/panorama/demo-panorama.jpg` in Storage, plus `media/book/demo-book` and `media/panorama/demo-panorama` in Realtime Database. It validates size, file signature, and panorama dimensions. Existing matching files and records are skipped; conflicting targets stop the run. Failed metadata writes are checked before conditional cleanup, and an interrupted run can be repeated. The publisher preserves unrelated records and existing bucket CORS entries.

1. Install dependencies with `npm install`, then sign in with `npx firebase-tools login`. Use a Google account with Storage object/bucket and Realtime Database permissions on this project. The script uses the CLI login in memory and never asks for a service account key.
2. Review and deploy the production rules in `firebase/`: `npm run firebase:deploy`. These rules supply the required catalog indexes, preserve lesson access, and require a `contentEditor: true` Firebase Auth custom claim for client uploads and per-record verification reads. The local publisher uses trusted Google IAM credentials; it is not the teacher sign-in flow.
3. Preview the exact asset and database paths without making any Firebase request: `npm run media:publish`.
4. Publish with `npm run media:publish -- --apply`. The script also adds `http://localhost:4200` and `http://127.0.0.1:4200` to bucket CORS when absent. For a deployed site, include its real HTTPS origin: `npm run media:publish -- --apply --cors-origin https://your-site.example`. You can repeat `--cors-origin`. A concurrent bucket change stops the CORS update rather than replacing it.
5. `MEDIA_CLOUD_ENABLED` is already enabled following the owner's Blaze upgrade. Reload the app after publishing. Catalogs are read once per kind per app session; file URLs resolve only when selected. Failed Firebase requests show an error rather than silently substituting local demos.

The publisher adds a Firebase download token to each new Storage object so `getDownloadURL()` can resolve it. These URLs are shareable. [Storage CORS](https://cloud.google.com/storage/docs/using-cors) is needed for browser PDF fetches from a deployed origin; rerun the publisher with that origin if the site address changes. Only use origins you control. Browser uploads through `MediaLibraryService.upload()` still require an authenticated editor with the custom claim; the app does not currently provide that sign-in UI.

PDF/image fetching still consumes bandwidth even when URLs are cached. Server-side Storage rules enforce size and declared MIME type, while the publisher checks the actual bundled files. If deployment or upload is denied, check CLI account permissions and rules; do not loosen public write rules.
