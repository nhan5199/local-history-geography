# Project structure

The application is organized by feature. Each page keeps its template, styles, and
tests together. Angular's [style guide](https://angular.dev/style-guide) recommends
grouping related files and organizing application code by feature areas.

```text
local-history-geography/
|-- docs/                         # Feature notes and roadmap.md
|-- firebase/                     # Database and Storage rules
|-- public/
|   |-- demo/                     # Labeled demo media and PDF worker
|   |-- illustrations/            # Original catalog SVG artwork
|   |-- maps/                     # Map geometry
|   `-- mascot/                   # Milo artwork
|-- scripts/                      # Publishing, provisioning and map tools
|-- src/
|   |-- app/
|   |   |-- app-root/
|   |   |-- core/firebase/        # Shared SDK, auth, catalogs and Excel services
|   |   |-- layout/app-shell/
|   |   |-- shared/components/catalog-card/
|   |   |   |-- catalog-card.ts
|   |   |   `-- catalog-card.scss
|   |   |-- features/
|   |   |   |-- books/
|   |   |   |   |-- pages/
|   |   |   |   |   |-- book-list/
|   |   |   |   |   `-- book-reader/
|   |   |   |   |-- types/page-flip.d.ts
|   |   |   |   |-- utils/         # PDF byte reader and its tests
|   |   |   |   `-- books.routes.ts
|   |   |   |-- companion/
|   |   |   |   |-- components/project-companion/
|   |   |   |   |-- config/companion.config.ts
|   |   |   |   |-- data-access/lesson-guide.ts
|   |   |   |   |-- models/guide-message.ts
|   |   |   |   `-- voice/guide-voice.ts
|   |   |   |-- games/
|   |   |   |   |-- pages/games-page/
|   |   |   |   `-- utils/         # Game scoring and its tests
|   |   |   |-- lessons/
|   |   |   |   |-- components/
|   |   |   |   |   |-- explorer-scene/ # Interactive cartoon landscape
|   |   |   |   |   `-- map-illustration/
|   |   |   |   |-- data/sample-lessons.ts
|   |   |   |   |-- data-access/lesson-repository.ts
|   |   |   |   |-- models/lesson.ts
|   |   |   |   |-- pages/
|   |   |   |   |   |-- lesson-list/
|   |   |   |   |   `-- lesson-detail/
|   |   |   |   `-- lessons.routes.ts
|   |   |   |-- map/
|   |   |   |   |-- components/
|   |   |   |   |   |-- area-preview/
|   |   |   |   |   `-- map-menu/
|   |   |   |   |-- models/map-region.ts
|   |   |   |   `-- pages/map-page/
|   |   |   |-- panorama/
|   |   |   |   |-- pages/panorama-page/
|   |   |   |   `-- types/pannellum.d.ts
|   |   |   `-- questions/
|   |   |       |-- data/demo-question-sets.ts
|   |   |       `-- pages/
|   |   |           |-- question-bank-page/
|   |   |           |-- questions-page/
|   |   |           `-- teacher-page/
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

Each page folder contains its component, HTML template, styles, and tests when
present. Supporting styles such as game controls and test results stay beside
the page that owns them. Generated output, dependencies, editor settings, and
TypeScript configuration files are omitted for clarity. App configuration,
feature route definitions, and CLI configuration remain at their conventional
entry points; they do not need individual folders.

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
| `features/map` | Interactive Đồng Nai SVG map, search, zoom, and region previews at `/map` |
| `features/games/pages`, `features/questions/pages` | Game/test catalogs, players, teacher imports, and question-bank pages |
| `features/books/pages`, `features/panorama/pages` | PDF library/reader and spherical 360° viewer |
| Feature `data`, `utils`, `types`, `config` folders | Sample data, pure helpers, third-party declarations, and feature configuration |
| `shared/components/catalog-card` | Native link/button cards with reused layout, interaction, focus, and reduced-motion styles |
| `firebase` | Local Firebase rule files, referenced by `firebase.json` |
| `public` | Static assets copied directly into the built application; illustrations are decorative, not place photographs |
| `src/styles.scss` | Bootstrap import and global styles |

## Dependency direction

The app shell hosts routed features. Features can use core infrastructure; core
does not import lesson pages or models. Data access owns database queries, while
pages own rendering and user interaction. Lessons still use labeled sample
content; books, panoramas, published tests, and games use Firebase catalogs.
The shared `CatalogCard` component is imported by each lazy catalog page. Its
attribute selector preserves native links/buttons and applies common card styles
without adding a wrapper or increasing the initial global stylesheet. Page
styles own their specific content and layout.

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

Students use the application without accounts. Teacher publishing and private
question banks require Firebase Authentication and server-enforced access. The
folder reorganization preserves these permissions and all existing public URLs.
