# Project structure

The application is organized by feature. Each page keeps its template, styles, and
tests together. Angular's [style guide](https://angular.dev/style-guide) recommends
grouping related files and organizing application code by feature areas.

```text
local-history-geography/
|-- docs/
|   `-- project-structure.md
|-- firebase/
|   |-- database.rules.json
|   `-- storage.rules
|-- public/
|   `-- favicon.svg
|-- src/
|   |-- app/
|   |   |-- core/
|   |   |   `-- firebase/
|   |   |       |-- firebase.config.ts
|   |   |       |-- firebase.service.ts
|   |   |       |-- firebase-emulators.ts
|   |   |       |-- realtime-database.service.ts
|   |   |       `-- firebase-storage.service.ts
|   |   |-- layout/
|   |   |   `-- app-shell/
|   |   |       |-- app-shell.ts
|   |   |       |-- app-shell.html
|   |   |       `-- app-shell.scss
|   |   |-- features/
|   |   |   |-- map/
|   |   |   |   |-- components/
|   |   |   |   |   |-- area-preview/
|   |   |   |   |   `-- map-menu/
|   |   |   |   |-- models/map-region.ts
|   |   |   |   `-- pages/map-page/
|   |   |   |       |-- map-page.ts
|   |   |   |       |-- map-page.html
|   |   |   |       |-- map-page.scss
|   |   |   |       `-- map-page.spec.ts
|   |   |   |-- companion/
|   |   |   |   |-- companion.config.ts
|   |   |   |   |-- components/project-companion/
|   |   |   |   |-- data-access/lesson-guide.ts
|   |   |   |   |-- models/guide-message.ts
|   |   |   |   `-- voice/guide-voice.ts
|   |   |   `-- lessons/
|   |   |       |-- components/
|   |   |       |   `-- map-illustration/
|   |   |       |-- data/
|   |   |       |   `-- sample-lessons.ts
|   |   |       |-- data-access/
|   |   |       |   `-- lesson-repository.ts
|   |   |       |-- models/
|   |   |       |   `-- lesson.ts
|   |   |       |-- pages/
|   |   |       |   |-- lesson-list/
|   |   |       |   `-- lesson-detail/
|   |   |       `-- lessons.routes.ts
|   |   |-- app-root/app-root.ts
|   |   |-- app.config.ts
|   |   `-- app.routes.ts
|   |-- index.html
|   |-- main.ts
|   `-- styles.scss
|-- angular.json
|-- firebase.json
|-- package.json
`-- README.md
```

The tree shows the application architecture; generated output, dependencies,
editor settings, and TypeScript configuration files are omitted for clarity.

## Responsibilities

See [Firebase service examples](firebase-services.md) for database CRUD, live
subscriptions, file uploads/downloads, and an account-free local emulator setup.

| Location | What belongs here |
| --- | --- |
| `core/firebase` | Firebase configuration, SDK initialization, and shared access to Database/Storage |
| `layout/app-shell` | Site header, navigation, footer, and router outlet |
| `features/lessons/pages` | Components reached through lesson routes |
| `features/lessons/components` | Presentation components owned by the lessons feature |
| `features/lessons/models` | Lesson and quiz TypeScript types |
| `features/lessons/data` | Bundled sample lessons |
| `features/lessons/data-access` | Lesson-specific database queries |
| `features/companion` | Floating character, lesson passage retrieval, and browser read-aloud |
| `features/map` | Interactive Đồng Nai SVG map, search, zoom, and region dialogs at `/map` |
| `firebase` | Local Firebase rule files, referenced by `firebase.json` |
| `public` | Files copied directly into the built application |
| `src/styles.scss` | Bootstrap import and global styles |

## Dependency direction

The app shell hosts routed features. Features can use core infrastructure; core
does not import lesson pages or models. Data access owns database queries, while
pages own rendering and user interaction. The existing pages use sample content;
the repository is ready for the later live-data integration.

Root routing lazy-loads the lessons feature. Feature routing lazy-loads its pages.
The existing URLs stay `/` for the library and `/lessons/:id` for a lesson.
The `/map` route separately lazy-loads the Đồng Nai map; geometry is fetched from
`public/maps/dong-nai.json`. See [map data and interaction notes](dong-nai-map.md).

## Adding code

1. Add a new user-facing capability under `features/<feature-name>`.
2. Give every component its own folder; keep its `.ts`, `.html`, `.scss`, and
   `.spec.ts` files together when present.
3. Keep feature-specific components and queries within their feature.
4. Introduce `shared/` only when independent features actually reuse something.
5. Keep app-wide integrations in `core/` and domain-specific queries in a feature.
6. Use explicit imports and standalone components; a new folder does not need an
   NgModule or an `index.ts` barrel.

No authentication, guards, interceptors, or global state framework are needed for
the current account-free application. Add them when a concrete feature needs them.
