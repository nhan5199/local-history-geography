# Milo, the learning companion

Milo is a floating explorer owl shown throughout the app. Select the character to
open the question panel. Hide leaves a small Show Milo button in the same corner;
the arrow button switches between the bottom-left and bottom-right corners.

## What works now

- Question panel with keyboard focus, Escape to close, and suggested questions.
- Answers retrieved from the same bundled sample lessons shown in the library.
- App guidance for navigation, quizzes, and the companion's controls.
- Links back to the lesson used for an answer.
- Optional Listen/Stop buttons using browser speech synthesis. No microphone input.
- Position and visibility preferences stored locally, with a fallback if storage is blocked.
- Conversation held only in memory, capped at 20 messages, and reset on refresh.

This is a passage-retrieval guide, not generative AI. It does not invent facts about
real places, access a model provider, or query the Firebase database. It cannot answer
everything; unrelated questions receive a helpful explanation of its scope.

Read-aloud starts only when the user selects Listen. Hiding or closing the panel
stops speech. Voices and availability depend on the browser and operating system;
voice rendering can use their speech services. The application does not save chat
messages or send questions to Firebase or an AI provider.

## Customize the character

Edit `src/app/features/companion/companion.config.ts`:

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
|-- companion.config.ts
|-- components/project-companion/    # Widget, panel, conversation state
|-- data-access/lesson-guide.ts      # Passage retrieval and app guidance
|-- models/guide-message.ts          # Answer/source/message types
`-- voice/guide-voice.ts             # Browser read-aloud lifecycle

public/mascot/milo.svg               # Character artwork
```

The app shell loads the widget with Angular `@defer (on idle)`. Lesson content loads
when a lesson question is asked. The guide reads `SAMPLE_LESSONS` dynamically, so
editing the existing lesson content also updates its searchable knowledge.

If a generative AI provider is added later, replace the guide's answer implementation
with a backend request that retrieves approved lesson context and returns sources.
Keep provider credentials on the backend. The current UI already has pending and
error states, but no provider integration or model-generated response is claimed.

[Speech synthesis reference](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
