# vintage eFriend

Cassette mascot asset pack for Expenity, based on the v3 design. This folder is checked into the repository for future integration by Claude Code or other contributors. The active mascot is still defined in `../../efriend.js` and has not been replaced.

## SVG files

- `efriend-cassette.svg`: master inline SVG, default happy expression, all reaction layers and animations.
- `efriend-happy.svg`: ontrack / happy.
- `efriend-cheer.svg`: comfortable / done, wide smile and happy hop.
- `efriend-neutral.svg`: tight / nodata, straight mouth.
- `efriend-worried.svg`: atrisk / unlikely, concerned mouth and slower reels.
- `efriend-thinking.svg`: continuously turning mechanical reels during analysis.
- `efriend-smile.svg`: first tap: smile, jump, wave and a floating heart.
- `efriend-giggle.svg`: several taps: giggle, wobble and waving tape arms.
- `efriend-angry.svg`: repeated taps: annoyed mouth, warm red reels, trembling tape arms, shake and steam.
- `efriend-icon.svg`: simple currentColor outline for message avatars and small action icons.

Every full-colour file retains glossy Nixie glass, the amber illuminated cathode, a blurred orange halo, metallic screw heads and intermittent electricity on the broken tube. The reels are mechanical gears, not cartoon eyeballs. Reel rotation replaces the old biological blink. The tape label remains decorative at small sizes.

## Recommended integration

Only the master SVG, CSS and adapter are required at runtime; individual poses are references or standalone assets.

1. The assets already live in `assets/vintage-efriend/`. When enabling this mascot, precache the required files in `sw.js` and copy this folder in every app/site/beta build and publish script.
2. Load `efriend-cassette.css` AFTER the existing stylesheet. Its scoped transforms replace the old robot's arm pivots without changing other illustrations.
3. Fetch the master SVG as trusted bundled text once, then import `installCassetteMascot` and call `installCassetteMascot(window.EX.efriend, svgText)` BEFORE drawing the first eFriend screen. Call the returned function to restore the previous renderer.
4. Keep the existing poke handler and `F.sound`: it already applies `ef-poke-smile`, `ef-poke-giggle`, `ef-poke-angry` for 1300/2400ms using the existing 1/3/5-tap thresholds. The adapter keeps these exact class hooks and namespaces gradient/filter IDs per instance.
5. Render the returned SVG INLINE, not as an `<img>`. An image may animate by itself, but page CSS, the existing tap handler and app motion settings cannot reach its internal elements. For standalone images, use the relevant pose file instead.
6. If replacing the small chat outline, have `F.icon(size)` render the icon inline with unique dimensions. It is intentionally static.
7. Preserve the original SVG source layers: do not flatten it into a PNG or remove class names, filter IDs or transform origins during optimisation.

## Motion and accessibility

Hover, shadow, tape-arm wave, cheerful hop, smiles, giggles, annoyed shake, heart/steam, mechanical reel turning, amber blur/glow and intermittent electrical arcs are included. Existing app motion off/reduced and system prefers-reduced-motion disable movement. Static glow and a faint static arc remain visible. The local preview includes a Motion toggle and realistic transient tap reactions. Deliberate tracking is done by existing financial verdicts; the art does not invent a verdict or change personality/sounds.

This is not an automatically installed replacement. The helper and preview have been checked separately; integration into the current app still needs its visual checks for existing headers, cards, chat and multiple simultaneous instances.

## Finding this design

Name: **vintage eFriend**. Entry point: `assets/vintage-efriend/efriend-cassette.svg`. Integration helper: `assets/vintage-efriend/install-cassette.js`. Open `preview.html` for the interactive design preview. The old robot renderer and its tap handler are in `efriend.js`; keep its sound and tap timing when replacing its renderer. This commit stores the design only and does not enable or deploy it.
