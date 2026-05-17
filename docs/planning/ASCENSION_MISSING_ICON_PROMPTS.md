# Ascension tree — missing icon prompts (AI image gen)

Icons are **small square chips** shown on the ascension constellation (`AscensionTree`). Match the style of existing files in **`public/game/ascension/`** (pixel art / retro game sprite, reads clearly at ~32–48px, high contrast, simple silhouette).

**Global constraints (every prompt):**

- **Pixel art** or **clean pixel-game icon**, not photorealistic.
- **Square canvas**, subject centered (e.g. 128×128 or 256×256).
- **No text**, no watermark, no UI frames, no logos.
- Background: **transparent** or **flat dark/neutral** so it sits on the starfield UI.

After generation, export as PNG and save with the **exact filename** under `public/game/ascension/`, then add the path to the matching slot in `types/game.ts` (`ASCENSION_DAMAGE_ICONS`, `ASCENSION_CLICK_ICONS`, or `ASCENSION_ANTIMATTER_ICONS`).

---

## Damage path

### `dmg_4.png` — **50 Push Ups**
**Game line:** `+70% damage`  
**Prompt:**
> Pixel art game icon, chunky badge or emblem. Funny gym / training vibe: crossed dumbbells or a stylized muscular arm mid push-up, sweat sparkle pixels, comic exaggeration. Ascension upgrade chip aesthetic, bold outlines, limited palette (oranges and greys optional). No text.

---

### `dmg_5.png` — **Very Very Strong**
**Game line:** `+90% damage`  
**Prompt:**
> Pixel art icon, power-up medallion. Abstract **double stacks** of strength: two overlapping flexed biceps silhouettes or twin upward arrows made of muscle-shaped blobs. Energetic spark pixels around edges. Tough but playful idle-game tone. No text.

---

### `dmg_7.png` — **Too Strong**
**Game line:** `+150% damage`  
**Prompt:**
> Pixel art icon, cracked stone medallion or burst emblem splitting apart from inner glow — suggests power exceeding limits. Small debris pixels flying outward. Warning-yellow or hot-red accent sparks. Funny overpowered vibe. No text.

---

### `dmg_8.png` — **No Need For That Much**
**Game line:** `+200% damage`  
**Prompt:**
> Pixel art icon, humorous „overkill”: giant cartoon fist next to a tiny harmless object (pixel cookie / pixel rock / pixel fly swatter — generic). Emphasize absurd scale mismatch. Ascension chip framing optional as soft circular vignette. No text.

---

## Click speed path

### `click_4.png` — **Clickly Clockly**
**Game line:** `+55% click speed`  
**Prompt:**
> Pixel art icon merging **cursor arrow** + **clock face** or **gear**: rhythmic clicking motion suggested by motion lines or duplicate faded cursor ghosts. Springy playful energy. Teal/yellow accents OK. No text.

---

### `click_5.png` — **Click Click Click**
**Game line:** `+70% click speed`  
**Prompt:**
> Pixel art icon, three stacked mouse-pointer arrows or three descending „impact ripples“ like mouse clicks on a surface. Fast repetitive rhythm vibe (motion blur pixels). Bright arcade accent colors. No text.

---

### `click_6.png` — **Click More**
**Game line:** `+95% click speed`  
**Prompt:**
> Pixel art icon, exaggerated **mega cursor** or **hand tapping** with plus-sign sparkle bursts (implies „more clicks“). Encouraging idle-game humor. Clean readable silhouette. No text.

---

## Antimatter path (Dark)

Pair visually with **`anti_1`** (`Dark-`, uses condenser-themed art): same **dark purple / void / antimatter** mood, second step in the chain.

### `anti_2.png` — **-Ness**
**Game line:** `+35% antimatter fill rate`  
**Prompt:**
> Pixel art ascension chip icon. Abstract „minus / absence“ entity: swirling dark void spiral or silhouette dissolving into shadow particles; subtle **neon violet rim** only (like antimatter sci-fi); ominous but cute-pixel proportion. Must feel like companion piece to a „dark matter condenser“ icon — same palette family. Title concept **„-Ness“** as pure darkness abstraction — **do not spell words**. No text.

**Negative hints:** no readable letters, no human face requirement (abstract preferred).

---

## Quick checklist

| Output file       | Upgrade name             |
|-------------------|--------------------------|
| `dmg_4.png`       | 50 Push Ups              |
| `dmg_5.png`       | Very Very Strong         |
| `dmg_7.png`       | Too Strong               |
| `dmg_8.png`       | No Need For That Much    |
| `click_4.png`     | Clickly Clockly          |
| `click_5.png`     | Click Click Click        |
| `click_6.png`     | Click More               |
| `anti_2.png`      | -Ness                    |
