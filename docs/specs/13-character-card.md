# Character interaction — revised direction

User decision: remove navigation cameos. Characters belong only to the flipping balance card. The previous low-detail character drawings are removed; new character artwork will be supplied by the user. Do not substitute mascots or regenerate the named characters without a new instruction.

## Proposed sequence

1. On Home, after the balance counter settles, characters appear behind the top/side edges of the balance card. Heads/upper bodies sit behind the card; hands overlap its frame. Keep all amounts, labels and the flip control unobstructed.
2. A restrained hand/shoulder motion suggests they are trying to turn the card. This must not flip the card automatically or change any financial state.
3. User activates the existing card by touch, mouse, Enter or Space. Its existing flip action and accessibility state remain the source of truth.
4. Hands release the edges, characters turn away, then duck behind the card as it completes the flip. They remain hidden until the next Home visit, rather than reappearing on every redraw.
5. Reduced/off motion: preserve the instant/basic card interaction with no character sequence. Pause while the app is hidden; hide characters during dialogs and dashboard editing. Respect Small/Medium layouts; omit characters where the layout cannot keep content clear.

## Artwork needed before implementation

High-resolution transparent character cutouts, ideally matching front/holding and turned-away poses. Separate hand layers allow convincing contact with the card edges. Artwork should include complete ears/cap and hands with enough clear padding. Character size should be materially larger than the old 70px navigation drawings, sized to the card rather than the viewport.

Status: interaction direction recorded; awaiting supplied artwork. No placeholder character animation is shipped as a completed feature.

## Artwork style confirmed

User reference: https://www.pinterest.com/pin/mickey-and-minnie-valentines-day-drawing--5348093303221313/

Pencil-drawing style, confirmed explicitly by the user: expressive graphite outlines, softly shaded volume and a hand-drawn sketch character. Preserve recognizable proportions and natural faces; avoid the old geometric SVG look and the proposed glossy 3D character direction. The reference was inspected in the browser; it is a style reference, not a supplied layered production asset. Larger characters should retain crisp pencil detail at device scale. Keep them local to the balance card and keep numbers/controls unobstructed.

Still awaiting usable character artwork/poses for integration. A single static reference does not supply the holding/release/turned-away sequence; do not claim that interaction is complete before those visual states exist.
