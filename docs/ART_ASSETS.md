# Rendered porcelain artwork

These original PNG assets were generated with the built-in image generation tool for Queenie's, using the owner's approved concept as a style reference. They are bundled locally under `public/art/` and require no image-generation service at runtime. Source prompts are preserved in `docs/art-prompts.json`.

- `ivory-figures.png` / `midnight-figures.png`: sixteen individual neutral figures per army, including eight distinct pawn faces and paired major/minor pieces.
- `party-figures.png`: coral, lake-blue, honey, and jade armies.
- `ivory-actions.png` / `midnight-actions.png`: ready, strike, celebrate, and fallen poses for all six roles.
- `tabletop-day.png` / `tabletop-night.png`: decorative table environments behind the live, interactive board.

The image viewer may display RGB backdrop colors from fully transparent pixels. Judge transparency in the browser, or inspect the PNG alpha channel. Sprite cropping uses source coordinates; keep frame metadata synchronized if replacing an atlas. Do not crop or resize these source files without updating that metadata. The static board, player portraits, movement, and capture scenes share the same locally bundled collection. Classic vector artwork remains selectable.

Rendering is decorative: it must never change piece identity, legal squares, turn authority, game outcomes, saved preferences, or hit targets. Generated scene props are never controls. Include every referenced asset in the Sites source package.
