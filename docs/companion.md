# Milo, the learning companion

Milo is a floating explorer owl shown throughout the app. Select the character to
open the question panel. The character is the only dock control; select it again,
use the panel close button, or press Escape to close the conversation.

## What works now

- Question panel with keyboard focus, Escape to close, and suggested questions.
- Vietnamese and unaccented Vietnamese matching, English topic aliases, and current-page context.
- Short answers from the same lesson passages displayed on the lesson page, with
  Vietnamese passages and matching activities kept in the shared lesson data.
- Follow-up examples and another passage from the same lesson; clarification when
  the question lacks a topic or the content cannot establish an answer.
- App guidance for the map, books, panoramas, games, tests and teacher login.
- Public catalog titles/descriptions already loaded by the app; no extra network
  reads. Game/test metadata includes title and count only, never answer keys or banks.
- Links to the supporting lesson section or public catalog.
- Optional Listen/Stop buttons using browser speech synthesis. No microphone input.
- Fixed corner configured in code; no position or hide/show buttons or saved preferences.
- Conversation held only in memory, capped at 20 messages, and reset on refresh.

This is a local passage-retrieval guide, not generative AI. Matching uses normalized
terms, a small bilingual topic vocabulary, source coverage and current-page ranking.
It does not understand every phrasing or typo. No model provider is configured.
Unknown facts and unsupported local dates receive an honest fallback. Region/place
descriptions and video transcripts cannot be answered until those sources exist.
Catalog knowledge is limited to public metadata loaded during this visit, refreshed
when the existing catalog service returns new content; it is not a live global index.

Read-aloud starts only when the user selects Listen. Closing the panel
stops speech. Voices and availability depend on the browser and operating system;
voice rendering can use their speech services. The application does not save chat
messages or send questions to Firebase or an AI provider.

## Customize the character

Edit `src/app/features/companion/config/companion.config.ts`:

```ts
export const COMPANION_CONFIG = {
  name: 'Milo',
  imageSrc: '/mascot/milo.svg',
  stillImageSrc: '/mascot/milo.svg',
  defaultSide: 'right' as 'left' | 'right',
};
```

Place a replacement SVG, PNG, WebP, or GIF in `public/mascot/`, then change `imageSrc`.
For an animated GIF, keep `stillImageSrc` pointing to a static poster so reduced-motion
preferences can be respected. The starter is a static vector illustration.

## Implementation

```text
features/companion/
|-- config/companion.config.ts
|-- components/project-companion/    # Widget, panel, conversation state
|-- data-access/lesson-guide.ts      # Passage retrieval and app guidance
|-- models/guide-message.ts          # Answer/source/message types
`-- voice/guide-voice.ts             # Browser read-aloud lifecycle

public/mascot/milo.svg               # Character artwork
```

The app shell loads the widget with Angular `@defer (on idle)` on home, lessons,
map and the book catalog, keeping immersive readers/players clear. Lesson content
loads dynamically when needed. Editing shared lesson passages updates visible
content and the guide together. `shared/data-access/public-catalog-context.ts`
holds bounded public metadata provided by existing catalog services and the map.

Closing, resetting or navigating invalidates pending answers. Topic context resets
on navigation. Read-aloud prefers a Vietnamese voice and stops when the panel closes.
The compact panel uses native controls and short transform/opacity animations;
reduced-motion settings disable them. No artificial typing delay is added.

If a generative AI provider is added later, replace the guide's answer implementation
with a backend request that retrieves approved lesson context and returns sources.
Keep provider credentials on the backend. The current UI already has pending and
error states, but no provider integration or model-generated response is claimed.

[Speech synthesis reference](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
