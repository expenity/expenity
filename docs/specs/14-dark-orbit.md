# Vader — Dark orbit

Requested on 2026-10-17: a black-and-white animated Darth Vader theme, including Vader himself, flying battle spacecraft, stars, planets and a dark atmosphere.

## Ready locally

- Pure-black page, charcoal surfaces, white primary controls with black text, grayscale category icons and semantic colors. Financial signs/labels remain visible. User photos retain their original colors.
- Layered moving stars, eclipsed planet, moon, orbital station, fighter patrol and slow cruiser. Detailed bundled vector spacecraft require no remote asset requests.
- Star/planet details and a fighter patrol on the balance card, with opaque fields and readable amounts.
- English/Greek picker and saved selection before first paint; respect Off/Reduced and operating-system reduced motion, and stop ambient movement when the page is hidden. Decorative layers do not intercept interaction or create horizontal scrolling.

## Supplied artwork and implemented interaction

The user supplied https://pixabay.com/illustrations/ai-generated-darth-vader-caricature-7914418/ by ZT_OSCAR. A locally bundled 36KB WebP copy is used under the source's separate Pixabay license, recorded in `assets/themes/ARTWORK.md`; it is not relicensed as GPL.

Vader appears above/behind the balance card at a larger size, with grayscale/contrast styling confined to the decorative portrait. He subtly breathes, turns aside and retreats when the user flips the card. The hidden state survives ordinary redraws and resets on the next Home visit. No holding/back pose is fabricated from the supplied standing portrait.

Motion off/reduced, compact balance layouts, dialogs and dashboard editing hide the character. Existing click/keyboard card controls and financial state remain unchanged.

Validation: English/Greek widths 320/390/834/1440, decorative pointer behavior, primary-control contrast, animation preferences, portrait retreat, redraw persistence, Home revisit, keyboard operation and saved theme restoration.

Release: 0.12.3. App-only publication; public website/docs/blog unchanged.
