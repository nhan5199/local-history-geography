# Educational website roadmap and work checklist

Requested: 2026-10-23. Last updated: 2026-10-24 (Asia/Saigon).

This is the ongoing checklist for the owner's requested improvements. Completed
follow-up implementation is recorded separately below; other tasks remain pending.
Keep student-facing copy in friendly Vietnamese and preserve the working map.

## How to track work

- Read the relevant section before starting a related task. Keep task IDs stable.
- `[ ]` means acceptance is still pending, including partially implemented work.
  `[x]` means the stated behavior has been implemented and verified.
- When starting work, record the active task IDs and any concrete blocker below.
- Check off each completed task individually and add a completion-log row with
  date, changed files, actual checks/results, and local/committed/deployed state.
  Mark a section complete only when every required task and its acceptance pass.
- Existing code is a starting point, not proof that the requested experience works.
  Recheck it during implementation. Reopen a task if a regression is found.
- Suggestions in section 7 are candidates to select in a future task. Preserve
  the privacy, content, Firebase, and authorization rules in [AGENTS.md](../AGENTS.md).
  Listing a feature here does not provision paid services or deploy changes.

Active task IDs: none. Latest completed scope: contextual Vietnamese Milo and
larger illustrated activity tiles with shorter copy.

## Follow-up requested on 2026-10-23

- [x] **STRUCT-01 — Consistent feature folders.** Group each page's component,
  template, styles, and tests in its own `pages/<page>/` folder; put loose feature
  data, helpers, type declarations, and configuration in named folders. Update all
  imports, lazy routes, documentation links, and the actual folder structure guide.
- [x] **CARD-01 — Existing lists as image cards.** Update the lesson, game, test,
  book, and panorama catalogs with lightweight illustrations, whole-card native
  links/buttons, clear action labels, hover lift/image feedback, and a press
  animation. Verify keyboard/touch use, reduced motion, responsive layouts, and
  existing loading/error/player behavior. Keep demo content labeled.

- [x] **PLAY-01 — Storybook interaction pass.** Add original cartoon artwork, an interactive home landscape, tactile illustrated activity entries and shared catalog animation; improve navigation and Vietnamese discovery controls. Verify phone/desktop, keyboard/touch, reduced motion, existing map and catalog behavior. See [design notes](child-friendly-design.md).

## Current foundations

Follow-up on 2026-10-24:

- [x] **MILO-01 — Contextual local guide.** Vietnamese/accent-insensitive questions,
  current-page context, follow-ups, grounded source links, public catalog metadata,
  Vietnamese read-aloud, honest unknowns and safe close/reset behavior. No paid AI
  provider, private bank access, or additional catalog reads.
- [x] **PLAY-02 — More images, less text.** Larger illustrated activity tiles,
  shorter home/catalog copy, discovery stars and brief Milo animations. Preserve
  labels, sample notices, keyboard/touch/reduced-motion behavior and responsive layout.

Source inspection on 2026-10-23; these are code findings, not fresh runtime or
production verification. No requested feature group is signed off yet.

| Area | Existing foundation | Remaining requested work |
| --- | --- | --- |
| Lessons | Home page has searchable sample lesson cards; lesson detail routes exist. | Published local content and region connections; dedicated `/lessons` catalog now exists. |
| Games | `/games` lists published games and starts the existing game player. | Improve discovery/filtering and connect games to lessons and regions. |
| Map | Region selection, search, zoom, hover previews, and a compact selection card exist. | Centered click popup, a region hub, popular-place pages, and linked tours. |
| Owl / Milo | Typed questions, sample-lesson passage retrieval, source links, and optional read-aloud exist. | Relevant answers across published site content, page context, and richer animation. |
| Teacher tests | `/questions` lists published Firebase tests; teacher import/bank tools and local scoring exist. | Better discovery and teacher analytics across submissions. |
| Media / loading | Firebase book/panorama catalogs, spherical 360° viewing, lazy routes, and loading/error messages exist. | Place-linked tours, consistent skeletons, and measured performance improvements. |
| UI | Illustrated cards, Vietnamese copy in many areas, animations, and reduced-motion handling exist. | A coherent, more child-friendly experience across all screens. |

Useful implementation references:
[routes](../src/app/app.routes.ts),
[lesson list](../src/app/features/lessons/pages/lesson-list/lesson-list.ts),
[games](../src/app/features/games/pages/games-page/games-page.ts),
[map notes](dong-nai-map.md), [Milo notes](companion.md),
[teacher tests](questions.md), and [media setup](media-library.md).

## 1. Lesson and game list pages

- [x] **CAT-01 — Dedicated lesson catalog.** Add an explicit lesson-list page
  (proposed `/lessons`) with clear navigation from home; preserve existing home
  content and `/lessons/:id` links.
- [ ] **CAT-02 — Useful lesson discovery.** Show title, illustration, short summary,
  topic, region, age/grade suitability, and learning time where verified metadata
  exists. Support search, appropriate filters, reset, and a helpful no-results state.
- [ ] **CAT-03 — Published lesson content.** Connect the catalog/details to validated
  published lessons through the existing repository. Label samples, and distinguish
  loading, empty, unavailable content, and errors with retry.
- [ ] **CAT-04 — Complete the game catalog.** Reuse `/games`; add clear game-type,
  topic/region, and difficulty discovery with descriptive cards. Preserve all six
  existing answer formats and their accessible controls.
- [ ] **CAT-05 — Connect learning activities.** Link lessons to relevant games/tests
  and allow return to the originating list with its search/filter state preserved.

Acceptance: a learner can open both lists from navigation, find an activity, open
it, and return on phone and desktop; missing data and failed requests are honest.

## 2. Map popup, region pages, and visits to popular places

- [ ] **MAP-01 — Centered region popup.** Clicking/tapping a named map region opens
  a centered dialog with its name, verified introduction, image/diagram label,
  close control, and a clear “Khám phá vùng đất” button. Support keyboard activation,
  focus containment/restoration, Escape, and a phone layout; keep pan/zoom working.
- [ ] **MAP-02 — Region content and stable links.** Define a region record keyed by
  the map's existing administrative code, with approved descriptions, media, and
  linked lesson/game/place IDs. Proposed route: `/regions/:regionId`. Handle missing
  or unpublished regions without inventing facts or breaking map selection.
- [ ] **MAP-03 — Region hub.** The popup button opens a separate region page with
  introduction videos, lessons, games, and a “Địa điểm nổi bật” menu. Include clear
  active navigation, breadcrumbs/back-to-map, captions/transcripts for videos,
  and useful empty/error states in each section.
- [ ] **MAP-04 — Popular-place list and child pages.** Give each region a curated
  list of visitor attractions with image, short explanation, and its own page
  (proposed `/regions/:regionId/places/:placeId`). Verify local descriptions and
  sources; describe popularity qualitatively unless visitor figures are sourced.
- [ ] **MAP-05 — Explore each place.** Link actual place-specific spherical 360°
  scenes or an appropriate 3D experience from each place page. Reuse the panorama
  viewer and add connected viewpoints/hotspots for a Google Maps-like movement
  experience where source coverage exists, with mouse, touch, keyboard, and exit
  controls. A single rotatable panorama does not satisfy movement between places.
- [ ] **MAP-06 — Real media and coverage.** Track approved local photos, video,
  panoramas/viewpoints or models, ownership/license, and attribution for each place.
  Load heavy media only when selected; provide a readable alternative on unsupported
  devices. Missing media keeps that place's tour work pending; demos stay labeled.

Acceptance: map → centered popup → region → video/lesson/game/place → immersive
visit → return works for a region with real approved content. Verify every listed
place's promised tour before marking the full content rollout complete.

This request supersedes the earlier compact-card-only behavior described in
[map notes](dong-nai-map.md); update those notes when the popup is implemented.

## 3. Owl / Milo: useful questions, answers, and animation

- [ ] **OWL-01 — Shared site knowledge.** Make approved published lessons, region
  introductions, place descriptions, video transcripts, and useful public activity
  information available to the answer service. Keep private teacher banks and
  unpublished content outside the learner knowledge source.
- [ ] **OWL-02 — Understand typed questions and current context.** Accept free-form
  Vietnamese questions rather than requiring preset prompts. Use the current
  page/selected place and relevant conversation context; handle diacritics,
  reasonable spelling variation, follow-ups, and requests needing clarification.
- [ ] **OWL-03 — Ground answers in the website.** Retrieve relevant published
  information, explain it simply, and link to the supporting page/section. Say
  when the site's content cannot answer a question. Update answers after source
  content changes; avoid unrelated canned responses or invented local facts.
- [ ] **OWL-04 — Choose and implement the answer approach.** Compare an improved
  local retrieval guide with a backend-generated answer service against actual
  question examples. If a provider is chosen, keep credentials server-side, bound
  requests/costs, handle timeouts/cancellation, and document question-data handling.
  Record any paid-service or privacy decision before dependent implementation.
- [ ] **OWL-05 — Expressive, accessible states.** Improve idle/blink, greeting,
  thinking, answering/speaking, success, and unable-to-answer animations. Honor
  reduced motion, stop speech when closed, and keep Milo's dock to one character
  button with the existing close-button/Escape interaction.

Acceptance: try questions drawn from several lessons, regions, places, and site
navigation, plus follow-ups, unknown topics, and unavailable content. Answers must
match visible sources; pending/error states and reopening the panel must work.

## 4. Teacher-established question/test lists and analytics

- [ ] **TEST-01 — Improve the published-test catalog.** Reuse `/questions` and
  the existing teacher publishing workflow. Add suitable topic/region/difficulty
  filters, descriptions, question counts, and shareable test links. Keep private
  question banks separate from published activities.
- [ ] **TEST-02 — Preserve the complete test flow.** Support single-answer,
  multiple-answer, and true/false questions; keep answers editable until one
  “Lưu bài làm” submission grades the test. Include explanations and a full retry.
- [ ] **TEST-03 — Define participation metrics.** Specify starts, submitted
  attempts, completions, average score/percentage, score distribution, and date
  range per test. Explain repeat attempts and test-version changes. The requested
  “total users taking the test” needs an explicit definition: attempts are not
  unique people, and unique students cannot be inferred from local-only results
  without a separate privacy/product decision. Keep that distinction visible.
- [ ] **TEST-04 — Safe aggregate collection.** Design and verify an allowed,
  bounded server-side aggregation path before adding shared statistics. Keep
  individual student results local and collect no student identifiers under the
  current agreement. Validate counts/scores, prevent duplicate submission retries
  and arbitrary counter writes, and document abuse limits and any unmet accuracy
  guarantees. Follow existing Firebase authorization/deployment rules.
- [ ] **TEST-05 — Teacher analytics view.** Show the agreed aggregate counts,
  average score, distribution, and optional per-question difficulty insights with
  date filters. Restrict detailed analytics to authorized teachers; handle no
  submissions, stale/unavailable statistics, and test revisions explicitly.

Acceptance: teacher publishes → learner finds/takes/submits → local feedback
appears → authorized teacher sees the defined aggregates. Verify score math,
retry handling, empty datasets, and denied unauthorized reads/writes. Do not
report an exact unique-user count until its definition and collection are resolved.

## 5. Skeleton loading, performance, and usability

- [ ] **PERF-01 — Measure a baseline.** Record initial load, route navigation,
  layout movement, and heavy-viewer readiness on a representative phone/slow
  connection. Set measurable budgets from that evidence before optimizing.
- [ ] **PERF-02 — Consistent skeletons.** Add layout-matching placeholders to async
  catalogs, region/place pages, tests, and media areas. Reserve image/content space,
  announce loading accessibly, honor reduced motion, and always end in content,
  an empty state, or an actionable error.
- [ ] **PERF-03 — Load only what is needed.** Preserve lazy routes/viewers, size
  images appropriately, bound catalog reads and caches, avoid duplicate requests,
  and clean up viewers/listeners. Preserve PDF image surfaces and bounded page
  preparation required for reliable page turns.
- [ ] **PERF-04 — Verify the improvement.** Compare the same flows/devices against
  the baseline, test slow/offline/failed loads and rapid navigation, and fix stuck
  loading, lost state, unexpected movement, and unclear retry/back controls.

Acceptance: record before/after measurements and observed navigation behavior;
never claim faster performance solely because skeletons are visible.

## 6. A more child-friendly visual design

- [ ] **UI-01 — Research and select a direction.** Create a small mood board from
  internet/Pinterest references and educational sites. Save original source links,
  the useful patterns, and a proposed palette/type/illustration direction before
  implementing a consistent design. Starting references are listed below.
- [ ] **UI-02 — Shared visual language.** Apply readable Vietnamese typography,
  warm colors with sufficient contrast, playful original illustrations, consistent
  cards/spacing, clear navigation, and large touch targets across catalogs, map
  dialogs, region/place pages, tests, games, and teacher screens.
- [ ] **UI-03 — Helpful interaction.** Add purposeful button feedback and section
  reveals, clear selection/success/error states, and supportive copy without
  distracting motion. Preserve visible content without animation support and
  visible keyboard focus with the project's input-modality behavior.
- [ ] **UI-04 — Check the rendered experience.** Review phone/tablet/desktop,
  keyboard-only use, reduced motion, long Vietnamese text, loading/errors, and
  core interactions. Run a small teacher/child usability session when available;
  record actual feedback and any remaining validation gap.

Acceptance: a learner can find a lesson, use the map, ask Milo, and finish a game
or test with clear controls; responsive layouts, focus, and contrast are verified.

Starting references checked on 2026-10-23; proposed adaptations are design ideas,
not a claim that these sites establish the right design for this project:

- [PBS KIDS](https://www.pbskids.org/) offers games/video navigation: investigate
  approachable activity entry points and clear visual grouping.
- [Google Arts & Culture virtual tours](https://artsandculture.google.com/project/virtual-tours)
  groups cultural visits: investigate place discovery and tour entry patterns.
- [Smithsonian Learning Lab](https://learninglab.si.edu/about) links educator and
  grade-based collections: investigate organizing learning resources by audience.

Use references for patterns; create original assets or use media with permission.
Pinterest mood-board selection and visual review remain pending under UI-01.
The 2026-10-23 storybook pass selected and implemented a direction from PBS KIDS,
Duolingo's design article, and educational design galleries; references, palette,
motion rules and scope are recorded in [design notes](child-friendly-design.md).
The broader cross-site UI tasks and classroom feedback remain pending.

## 7. Suggested educational improvements to consider

These are additional proposals, separate from the six requested workstreams.

- [ ] **EDU-01 — Guided learning journeys.** Connect an introduction video, short
  lesson, map/place exploration, practice game, and recap test around one objective.
- [ ] **EDU-02 — Local learning passport.** Save visited places, completed lessons,
  bookmarks, and gentle achievement badges on the device, with a clear reset.
  Explain that progress is specific to that browser/device.
- [ ] **EDU-03 — History timeline and geography comparisons.** Add a sourced
  interactive timeline, “then and now” photos, and simple map-reading activities.
- [ ] **EDU-04 — Inclusive learning supports.** Offer a Vietnamese glossary,
  pronunciation/read-aloud, captions/transcripts, adjustable reading size, and
  text/image alternatives to immersive scenes.
- [ ] **EDU-05 — Classroom lesson packs.** Let teachers assemble existing published
  resources into a sequence and share a link/QR code; offer printable worksheets
  and field-trip observation prompts without requiring student accounts.
- [ ] **EDU-06 — Gentle revision.** Suggest practice from mistakes saved locally,
  give explanatory hints, and allow another attempt without public rankings.
- [ ] **EDU-07 — Content quality workflow.** Give teachers a preview/review process,
  source attribution and review dates, and a way to flag inaccurate content.
- [ ] **EDU-08 — Low-bandwidth access.** Explore optional downloads/offline reading
  for selected small lessons, with visible storage size, refresh, and removal controls.

## Suggested implementation sequence

1. Establish content IDs/relationships and performance baselines (MAP-02, PERF-01);
   select the visual direction (UI-01).
2. Improve lesson/game/test catalogs and shared UI/loading patterns (section 1,
   TEST-01/02, PERF-02, UI-02/03).
3. Complete one real map-to-region-to-place tour, then expand approved content
   coverage (remaining section 2).
4. Connect Milo to the published site knowledge and verify answer quality (section 3).
5. Resolve metric/privacy definitions, then implement and verify teacher aggregates
   (TEST-03/04/05). This can proceed separately from region content work.
6. Complete performance/usability checks (PERF-03/04, UI-04), then select section 7
   proposals based on classroom needs. Verify each earlier feature as it lands.

For behavior changes, run focused checks plus the project's required tests and
production build after integration. For documentation changes, validate the
documentation. Record actual outcomes in the log; implementation does not imply
deployment. Update related feature documentation when its described behavior changes.

## Completed work log

| Date | Task IDs | Work and evidence | State |
| --- | --- | --- | --- |
| 2026-10-23 | DOC-01 | Recorded all requested workstreams, source-inspected foundations, individual acceptance checklists, and optional educational proposals. Added discovery links in README.md and AGENTS.md. Documentation checks: relative links/anchors, unique task IDs, checkbox/log structure, preserved pre-existing AGENTS.md edits, and whitespace validation. | Local documentation only; no feature implementation, runtime verification, commit, or deployment. |
| 2026-10-23 | STRUCT-01 | Moved 32 files into feature page/data/utils/types/config folders; updated relative imports, lazy route imports, companion notes, this roadmap, and project-structure.md. Verified all move destinations and 11 documentation links; reviewed 23 supporting files and game/test/panorama class bodies for preserved behavior. All 61 tests pass across 14 files; production build passes with size/CommonJS warnings. Initial sandbox test compilation was blocked by filesystem access; validation succeeded with the required compiler access. | Local and tested; not committed or deployed. |
| 2026-10-23 | CARD-01 | Updated lesson, game, test, book, and panorama catalog templates/styles; added the shared native CatalogCard component and four original SVG illustrations. Verified all 61 tests and production build; Chrome passed 10 desktop/phone catalog cases with no runtime exceptions, covering artwork, layout, hover/press, keyboard focus, Enter/Space, reduced motion, touch feedback, and game/test empty/error/disabled states. Reviewed desktop and phone screenshots. | Local and tested; not committed or deployed. |
| 2026-10-23 | CAT-01 | Added `/lessons` using the existing lesson-list component with a focused catalog heading, home/main-navigation links, and detail return links; preserved home content, samples, and lesson URLs. Updated lesson routes, list template/styles/component/test, detail template, and app-shell navigation. All 62 tests pass, including catalog/detail/return routing; production build passes with size/CommonJS warnings. Chrome checks pass at 1440px and 390px with no runtime exceptions, including layout, keyboard, touch, animations, and reduced motion. | Local and tested; not committed or deployed. |
| 2026-10-23 | PLAY-01 | Added ExplorerScene with three native discovery buttons and unique session counts; refreshed home art/activity cards, navigation, Vietnamese filters/reset, shared catalog styling and four original SVG assets. See child-friendly-design.md for researched references and motion rules. All 63 tests pass across 15 files; production build passes with size/CommonJS warnings. Ten catalog browser cases and three home interaction cases pass (1440/768/390px for home), including keyboard/touch, reduced motion and map navigation, with zero runtime exceptions. Reviewed rendered screenshots. | Local and tested; not committed or deployed. |
| 2026-10-24 | MILO-01, PLAY-02 | Added normalized bilingual retrieval, current-page and follow-up context, source-section links, shared Vietnamese lesson passages, bounded public catalog metadata, Vietnamese chat/read-aloud and stale-reply cancellation. Simplified home text, enlarged illustrated activity tiles, added discovery stamps and finite Milo motion; OnPush limits unrelated rendering. All 81 tests pass across 18 files; production build passes with size/CommonJS warnings. Latest Chrome run passes two Milo desktop/phone cases and three home desktop/tablet/phone cases, with zero runtime exceptions; reviewed screenshots. Local observed reply times 106-119 ms include browser polling, not a production/device performance guarantee. Earlier browser timing checks had intermittent timeouts; latest cases completed successfully. | Local and tested; not committed or deployed. |

Browser checks used local fixtures with Firebase requests isolated and an explicit
panorama viewer double; they do not establish live Firebase behavior, spherical
rendering, or PDF pagination. Existing player logic was preserved and unit-tested.
Production build warnings remain for the initial bundle (504.11 kB against a
500 kB warning budget), several component styles, and the two CommonJS viewers.

Original feature-group tasks remain pending unless individually checked above.
Add subsequent rows using: date, completed task IDs, changed files, actual check
results, and local/committed/deployed state.
