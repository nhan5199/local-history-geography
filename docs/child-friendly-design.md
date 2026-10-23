# Little explorer's storybook

Design update requested 2026-10-23: freely improve the UI with cartoon art,
more animation, and interactions for elementary pupils. Preserve the existing
map, lesson content, teacher workflows, and Milo's single-button dock.

## References and selected direction

Reviewed on 2026-10-23:

- [PBS KIDS](https://www.pbskids.org/): clear games/video entry points. Adapt
  recognisable illustrated activity choices with short labels.
- [Duolingo's shape language](https://blog.duolingo.com/shape-language-duolingos-art-style/):
  expressive simple shapes, storytelling, and character personality. Adapt rounded
  silhouettes and friendly faces, with original artwork rather than copied mascots.
- [Children's education design gallery](https://dribbble.com/search/kids-education-website-design):
  visual exploration of illustrated heroes and cheerful activity cards. The gallery
  is inspiration, not usability evidence. Pinterest search did not return a usable
  original board; no Pinterest artwork has been copied.

Palette: forest ink `#294e42`, warm paper `#fffcf2`, sunshine `#ffda75`, sky
`#caebef`, peach and leaf accents. Use existing locally available rounded fonts,
dark text on light surfaces, generous labels, and tactile outlined controls.

## Implementation and acceptance

- Original interactive landscape on home: three native hotspot buttons reveal
  observation prompts and links to map, panorama, and lessons. Count distinct
  explored spots only for the current component session. Label the drawing as
  an illustration, not an actual local map or completed curriculum.
- Short cloud drift and owl blink finish within four seconds. Hotspot focus
  triggers brief ripples/sun movement. No continuous animation, autoplay sound,
  timers, rewards pressure, or added network services.
- Illustrated activity entries and shared catalog artwork; sticker labels,
  paper edges, hover tilt and button press feedback. Motion respects reduced motion.
- Navigation icons retain text labels; keyboard skip link, visible focus,
  large native controls, Vietnamese category labels and empty-search reset.
- Verify home and catalogs at phone/desktop sizes; mouse/touch/keyboard operation,
  reduced motion, no horizontal page overflow, no nested interactive card controls,
  no runtime exceptions. Check the map still opens and existing automated tests.

No claim of classroom validation: testing with children/teachers remains pending.
The full cross-site redesign and region/place pages remain tracked in the roadmap.

## Follow-up: 2026-10-24

Activity entries now use larger illustrations with short labels. Repeated home
marketing text and catalog subtitles are removed; essential names, learning time,
age information and sample notices remain. The interactive scene shows three
discovery stars with a brief pop animation. Milo's panel uses concise Vietnamese,
source buttons and optional follow-up chips, with brief thinking/speaking motion.
Home and Milo use OnPush change detection to avoid unrelated page work during chat.
All animations are finite and honor reduced motion; no animation library was added.
