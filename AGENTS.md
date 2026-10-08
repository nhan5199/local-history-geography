# Project working agreement

This Angular app helps elementary school students and teachers explore Đồng Nai's local geography and history. Keep the existing map working. Use friendly Vietnamese copy, playful illustrations, clear large controls, and accessible layouts.

## Workflow and efficient use of Codex

- Read this file at the start of each task. Turn each request into a small concrete implementation and acceptance checklist; resolve routine design choices independently.
- The user's preferred team is Astra at light reasoning for coordination and QA, and Sol at high reasoning for implementation. Use those settings only when the runtime exposes them. Do not claim to switch the current leader. In this session, workers use `gpt-6-sol` with `high` reasoning and independent QA uses `gpt-6-astra` with `low` (the available light setting); the leader cannot be changed mid-conversation.
- For substantial independent features, delegate bounded tasks with explicit file ownership. Share only necessary context. Avoid agents for tiny edits, duplicate investigations, or overlapping changes.
- The leader reviews integration, accessibility, loading/error states, Firebase costs, and tests. Send concrete defects back to the responsible worker and verify the fix before completion.
- Search with `rg`, batch independent reads, reuse existing services/components, lazy-load heavy viewers, and run focused checks first. Run a production build and relevant tests once after integration; repeat only for changes or failures.
- Keep progress updates concise. Record durable user requirements here; put task-specific details in documentation. These practices reduce unnecessary work but cannot guarantee a particular Codex quota or token cost.

## UI and content

- Keep Milo's floating dock to one character button. Do not add position, hide, or show controls; use the character, panel close button, or Escape to open/close the conversation.

- Prefer code-native SVG/CSS illustrations for lightweight cartoon art. Use Figma or canvas when it materially helps; external design files are optional.
- Animate buttons and reveal sections on scroll, honor `prefers-reduced-motion`, preserve visible content without animation support, and clean up observers/listeners/viewers.
- Books must display actual PDF pages with smooth page turning, touch/keyboard controls, bounded rendering, and honest failure states. Panoramas must use a spherical 360° viewer, not a flat scrolling image.
- PageFlip clones HTML pages during animation; cloned canvases lose their bitmap. Render PDF pages to decoded image surfaces before exposing a spread or starting a turn, and keep adjacent pages ready without unbounded caching.
- Label demo PDFs and panoramas clearly; retain source and license attribution. Do not present unrelated demo content as local curriculum.
- Game ordering must support direct mouse/touch dragging, with a keyboard alternative. Matching displays removable connector lines. Center game answer controls and place checking/navigation buttons below them with clear spacing. Missing-word answers show one letter blank per character and handle Vietnamese combining marks.
- Question lists behave as tests: equal-width choices, four short choices in a 2×2 grid (one column for long choices or narrow screens), and one “Lưu bài làm” action grades the complete test. Keep answers editable until submission and provide a full reset for retry.

## Firebase and safety

- Teacher Excel imports offer bank-only or bank-and-test publishing for both question tests and games. Keep the two banks separate and teacher-only. Difficulty defaults to 1; support levels 1–5 and legacy Excel files without the new column. Teachers browse by creation date and difficulty, preview random or specific selections, and explicitly publish the resulting test/game. Preserve reusable bank questions when creating a test and never silently omit older bank entries.

- Question lists support one correct answer, multiple correct answers, and true/false. Games also support ordering, matching, and missing-word answers, presented as a friendly gameshow. Teachers import validated Excel workbooks, preview before publishing, and can download an example workbook. Keep student results local and collect no student identifiers.
- Teacher login uses Firebase Authentication with username aliases or email and password; never store readable passwords in Realtime Database. Restrict publishing to an editor claim or a protected teacher UID allowlist. Only an administrator provisions teacher accounts; public signup does not grant teacher access.
- The owner authorized enabling email/password Authentication and provisioning the first teacher account (`nhan`) on 2026-10-07. Passwords must never be committed, logged, or recorded here. Deploying the question-specific Realtime Database rules required for teacher publishing is within this feature request.

- The owner upgraded this project to Blaze and explicitly requested Firebase on 2026-10-07. Use Firebase catalogs and Storage for books and panoramas by default. Publishing the existing demo assets and deploying their required rules are authorized for this request; authentication is still required. Cache bounded catalog reads and resolve a file only when selected.
- The owner explicitly approved creating the default Storage bucket and requested a region near Vietnam. Use Singapore (`asia-southeast1`), matching the database. This supersedes the earlier US region proposal; do not ask for this approval again.
- Never enable billing or open anonymous writes merely to make a demo work. Keep bundled demos for development/reference, not a silent substitute for failed Firebase reads.
- Store files in Storage and metadata in Realtime Database, never base64 PDFs/images in the database. Limit PDFs to 10 MiB and panoramas to 5 MiB; validate signatures, image dimensions, catalog sizes, and paths.
- Use emulator uploads during development. Production writes require an authenticated content editor custom claim and matching rules. Client file caps reduce usage but cannot guarantee project-wide free quotas or stop abusive traffic; billing alerts are not hard spending caps.
- Preserve student privacy and existing lesson security rules. Document CORS and deployment prerequisites. Do not deploy or change paid services without explicit authorization.
