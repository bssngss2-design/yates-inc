# Ascension icons — full AI prompt pack (Gemini / image models)

Use this document with **Google Gemini** (or any image generator) when **image generation** is turned on. Paste **one block at a time** so each asset stays on-model.

> **Scope:** These prompts cover **every ascension-tree upgrade that does not yet have a `public/game/ascension/` icon wired in code** (`types/game.ts` → `ASCENSION_NODES`). Paths that already have sprites (money, partial damage/click/antimatter/prism, AFK, partial luck/drops, Gilgamesh title art, etc.) are **not** listed here.

---

## How to use with Gemini

1. **First message:** Paste the **Master style bible** + **Technical specs** + **Global negatives** below. Ask Gemini to confirm it will follow them on every icon.
2. **Then:** For each upgrade below, paste **only that upgrade’s “Gemini prompt (paste)”** box (or the whole subsection).
3. **Iterate:** If an icon is muddy at small size, reply: *“Same concept but bolder silhouette, fewer tiny details, thicker outlines, higher contrast — still pixel art.”*

---

## Master style bible (paste once)

You are generating **inventory-style ascension chips** for a **humorous idle clicker game** (Cookie Clicker–adjacent tone: absurd names, meme energy, still readable UI).

**Visual language**

- **Pixel art** or **retro 16-bit game sprite icon** — not realistic, not smooth vector unless it still reads as chunky pixels.
- **Single focal emblem** centered in a square: medallion, badge, crystal, cartoon object, or stylized character bust — **not** a full widescreen scene.
- **Bold readable silhouette** at **32×32 px thumbnail** scale (design at 128×128 or 256×256, export PNG).
- **Limited palette** (6–14 colors + black outlines optional). Rim-light or inner glow OK if subtle.
- **Whimsical corporate / gaming mashup** humor matches existing icons (money jokes, gym jokes, anime refs in names stay **abstract** — avoid copying copyrighted characters verbatim).

**Mood by branch (for consistency)**

| Branch | Mood |
|--------|------|
| Money | Gold, cash, toilet-paper absurdity, “getting rich” cartoon greed |
| Damage | Gym, muscles, exaggerated strength comedy |
| Click | Mouse cursor, speed lines, arcade rhythm |
| Building | Fast food / wage jokes / factories — playful exploitation satire |
| Antimatter | Void purple, sci-fi darkness, silhouette bats acceptable abstract |
| Prism / Light | Rainbows, prisms, holy sparkles — friendly light fantasy |
| Bank | Credit scores, stacks of bills, vault motifs |
| Wizard | Silly fantasy wizard hats, sparkles, scrolls, discounted magic |
| Trader | Homeless joke names, bread slice, shady merchant vibes |
| Trinkets | Relics, crowns, charms, enchantment sparkles |
| Luck | Clovers, crowns, dice, golden halos |
| Drops | Treasure chests, maps, glowing loot pings |

---

## Technical specs (paste once)

- **Output:** One **square PNG**.
- **Recommended canvas:** **256×256** (minimum **128×128**).
- **Background:** **Transparent** preferred; if not possible, **flat dark navy `#0b1020`** matching a starfield UI.
- **No text** anywhere (no letters, numbers, watermarks, logos, UI bars).
- **Safe margin:** Keep important shapes inside ~85% of the canvas so circular masks in-game do not crop awkwardly.

---

## Global negatives (paste once)

Avoid: photorealistic skin, gore, hateful stereotypes, readable trademarks, subtitles, messy thin lines that disappear when shrunk, busy backgrounds, multiple disconnected focal points, full-body illustrations that shrink to noise.

---

## Filename → wiring checklist

After generation, save as **`public/game/ascension/<filename>.png`** using the filename under each heading. Then add that path to `types/game.ts` on the matching `node(...)` call (same pattern as existing `money_*.png` / `dmg_*.png` icons).

---

# Missing icons — prompts by node

---

## Origin

### `origin.png` — **The Beginning**

| Field | Value |
|-------|-------|
| **Node ID** | `origin` |
| **Effect** | Unlocks all ascension paths (hub node). |

**Design intent:** This sits at the **center of the constellation**. It should feel like **“first heavenly chip”** — humble but cosmic: a small **golden spark**, **tiny portal**, or **seed crystal** with a soft halo. Not flashy like endgame caps.

**Gemini prompt (paste):**

> Pixel art square icon, centered cosmic **origin spark**: a small glowing golden-white core with 4–6 chunky pixel rays and a few drifting sparkle pixels. Optional faint circular ring suggesting “unlock hub”. Idle-game ascension chip style: chunky outlines, limited palette (gold, cream, deep purple shadow accents). Transparent background. High contrast silhouette readable at 32px. No text, no UI frame.

---

## Building power path

### `build_1.png` — **$LA√3**

| Field | Value |
|-------|-------|
| **Node ID** | `build_1` |
| **Effect** | `+2% building power` |

**Gemini prompt (paste):**

> Pixel art square icon: humorous **math-money fusion** — a stylized **square-root symbol** merged with a **stack of dollar-green bills** or a bill folded into an impossible geometry joke. Chunky cartoon proportions, bold outline. Ascension idle-game badge. Transparent background. No text characters rendered.

---

### `build_2.png` — **Put The Fries In The Bag**

| Field | Value |
|-------|-------|
| **Node ID** | `build_2` |
| **Effect** | `+15% building power` |

**Gemini prompt (paste):**

> Pixel art icon: **fast-food service joke** — a paper **takeout bag** with steam wisps and exaggerated **golden fries** sticking out top; tiny spark pixels implying productivity buff. Bold chunky shapes, warm fry-yellow + brown bag palette. Transparent background. No readable logos or brand marks.

---

### `build_3.png` — **Client Always Right**

| Field | Value |
|-------|-------|
| **Node ID** | `build_3` |
| **Effect** | `+30% building power` |

**Gemini prompt (paste):**

> Pixel art icon: **customer-service absurdity** — a chunky **speech bubble** shaped like a crown or a **smiling receipt scroll** with sparkles suggesting “mandatory agreement”. Comedy idle-game tone. Bold silhouette. Transparent background. No text.

---

### `build_4.png` — **Keep Working**

| Field | Value |
|-------|-------|
| **Node ID** | `build_4` |
| **Effect** | `+40% building power` |

**Gemini prompt (paste):**

> Pixel art icon: **motivational exploitation humor** — a spinning **gear** fused with a **coffee mug** splash or an **hourglass** dripping pixels upward (impossible urgency joke). Industrial teal/grey palette accents. Ascension badge composition. Transparent background. No text.

---

### `build_5.png` — **30$ An Hour..Ok..**

| Field | Value |
|-------|-------|
| **Node ID** | `build_5` |
| **Effect** | `+55% building power` |

**Gemini prompt (paste):**

> Pixel art icon: **deadpan wage joke** — a tiny **piggy bank** shrugging posture suggested by tilt + sweat pixel, beside a **single thick dollar coin**. Comedy understatement vibe (not angry). Bold chunky outlines. Transparent background. Do not render readable numbers.

---

### `build_6.png` — **Alr Boss**

| Field | Value |
|-------|-------|
| **Node ID** | `build_6` |
| **Effect** | `+120% building power` |

**Gemini prompt (paste):**

> Pixel art icon: **middle-management humor** — chunky **clipboard** with a **tie-shaped sparkle** or a **mini megaphone** blasting productivity sparks. Corporate purple-grey accent OK. Ascension medallion layout. Transparent background. No text.

---

### `build_7.png` — **Now Were Talking**

| Field | Value |
|-------|-------|
| **Node ID** | `build_7` |
| **Effect** | `+150% building power` |

**Gemini prompt (paste):**

> Pixel art icon: **negotiation breakthrough** — two chunky **hands about to handshake** made of pixel blocks with **golden impact burst** between them (deal sealed joke). Clean silhouette. Transparent background. No text.

---

### `build_8.png` — **Keep Em Working**

| Field | Value |
|-------|-------|
| **Node ID** | `build_8` |
| **Effect** | `+180% building power` |

**Gemini prompt (paste):**

> Pixel art icon: **factory conveyor absurdity** — simplified **conveyor belt loop** carrying glowing **loot crates** or coins with motion streak pixels. Friendly idle-game evil corporation vibe. Transparent background. No tiny unreadable labels.

---

### `build_9.png` — **Retired**

| Field | Value |
|-------|-------|
| **Node ID** | `build_9` |
| **Effect** | `+220% building power` |

**Gemini prompt (paste):**

> Pixel art icon: **retirement punchline** — **beach chair + sunglasses** on a pile of **gold coins**, tiny umbrella pixel optional. Relaxation overpower joke. Bold shapes. Transparent background. No text.

---

### `build_10.png` — **Wippety Woppity**

| Field | Value |
|-------|-------|
| **Node ID** | `build_10` |
| **Effect** | `+250% building power`, grants title **Elon Musk** vibe (abstract). |

**Gemini prompt (paste):**

> Pixel art icon: **chaotic billionaire meme energy** — abstract **rocket silhouette** crossing a **stock chart zigzag** made of chunky neon-green/red pixels (no readable ticker text). Playful exaggerated motion sparks. Ascension capstone flair slightly larger glow. Transparent background. Avoid real person likeness.

---

## Bank path

### `bank_1.png` — **100 Credit score??**

| Field | Value |
|-------|-------|
| **Node ID** | `bank_1` |
| **Effect** | `+0.2% bank interest rate` |

**Gemini prompt (paste):**

> Pixel art icon: **tiny starter credit** — a **credit card chip** glowing faintly inside a **shield outline**, skeptical sweat sparkle optional (humorous doubt). Banking blues/golds. Transparent background. No readable numbers.

---

### `bank_2.png` — **500 Alr**

| Field | Value |
|-------|-------|
| **Node ID** | `bank_2` |
| **Effect** | `+0.3% bank interest rate` |

**Gemini prompt (paste):**

> Pixel art icon: **casual milestone** — thicker stack of **gold coins** with a **small upward arrow sparkle** suggesting improvement; chill vibe (“alr”). Bold silhouette. Transparent background. No digits.

---

### `bank_3.png` — **755 Now Were Talking**

| Field | Value |
|-------|-------|
| **Node ID** | `bank_3` |
| **Effect** | `+0.7% bank interest rate` |

**Gemini prompt (paste):**

> Pixel art icon: **credit climbing** — stylized **thermeter-shaped pillar** made of coins/glow tiers (abstract, **no numbers**). Excited sparkle burst at top. Banking greens/golds. Transparent background.

---

### `bank_4.png` — **Here's $500k**

| Field | Value |
|-------|-------|
| **Node ID** | `bank_4` |
| **Effect** | `+1% bank interest rate` |

**Gemini prompt (paste):**

> Pixel art icon: **money bag bounty** — chunky **vault door circular motif** behind an overflowing **money sack** tied with rope; cartoon sparkle stars. Strong silhouette. Transparent background. Do not write dollar amounts.

---

### `bank_5.png` — **(yk what? just take whatever :)**

| Field | Value |
|-------|-------|
| **Node ID** | `bank_5` |
| **Effect** | `+1.5% bank interest rate`, capstone title **Filthly Rich**. |

**Gemini prompt (paste):**

> Pixel art icon: **capstone bank absurd generosity** — **open vault** pouring coins like a waterfall into a **smiley halo** shape formed by sparkles (no face needed). Warm gold palette + cheeky vibe. Transparent background. No text.

---

## Wizard tower — cheaper path (A)

### `wizA_1.png` — **Aluackbuarbom**

| Field | Value |
|-------|-------|
| **Node ID** | `wizA_1` |
| **Effect** | `-5% wizard tower costs` |

**Gemini prompt (paste):**

> Pixel art icon: **gobbledygook wizard spell** vibe — swirling **purple glyph ring** around a **chunky bubbling cauldron splash** (abstract magic). Playful nonsense energy matching silly spell name. Transparent background. No readable runes—only decorative shapes.

---

### `wizA_2.png` — **Wathcigau**

| Field | Value |
|-------|-------|
| **Node ID** | `wizA_2` |
| **Effect** | `-10% wizard tower costs` |

**Gemini prompt (paste):**

> Pixel art icon: **discount wizard surveillance joke** — chunky **crystal ball** showing a **coin silhouette** inside with sparkle pixels (cheap vision gag). Purple/teal palette. Transparent background. No text.

---

### `wizA_3.png` — **Wizard Noob**

| Field | Value |
|-------|-------|
| **Node ID** | `wizA_3` |
| **Effect** | `-15% wizard tower costs` |

**Gemini prompt (paste):**

> Pixel art icon: **novice wizard comedy** — oversized **wizard hat drooping** over a tiny **wand spark** that’s awkwardly bent; cute clumsy proportions. Transparent background. No face detail needed—keep iconic silly hat silhouette.

---

### `wizA_4.png` — **Wizard Pro**

| Field | Value |
|-------|-------|
| **Node ID** | `wizA_4` |
| **Effect** | `-20% wizard tower costs` |

**Gemini prompt (paste):**

> Pixel art icon: **skilled wizard** — sharper hat brim, **dual spark orbitals**, neat symmetry; cleaner glowing wand streak arc. Ascension badge composition. Transparent background. No text.

---

### `wizA_5.png` — **Wizard Hacker**

| Field | Value |
|-------|-------|
| **Node ID** | `wizA_5` |
| **Effect** | `-25% wizard tower costs` |

**Gemini prompt (paste):**

> Pixel art icon: **magic meets glitch** — wizard hat fused with **matrix-like pixel shards** or **circuit veins** glowing cyan/purple (still chunky pixel style). Cyber-fantasy joke. Transparent background. No alphanumeric code.

---

### `wizA_6.png` — **Wizard Of OZ**

| Field | Value |
|-------|-------|
| **Node ID** | `wizA_6` |
| **Effect** | `-35% wizard tower costs` |

**Gemini prompt (paste):**

> Pixel art icon: **Somewhere-over-the-rainbow homage** — **emerald prism sparkle** + **ruby shoe silhouette as tiny abstract gems** (no film frame copying). Keep generic fantasy—magical road sparkle arc optional. Transparent background. No text.

---

## Wizard tower — stronger path (B)

### `wizB_1.png` — **Logan Strenght 2.o**

| Field | Value |
|-------|-------|
| **Node ID** | `wizB_1` |
| **Effect** | `+2% ritual power` |

**Gemini prompt (paste):**

> Pixel art icon: **sequel joke strength** — cartoon **flexed arm silhouette** merged with **version badge star** (“2.o” vibe **without typing numbers** — use twin spark dots instead). Bold humorous silhouette. Transparent background.

---

### `wizB_2.png` — **Stronger Than Logan**

| Field | Value |
|-------|-------|
| **Node ID** | `wizB_2` |
| **Effect** | `+4% ritual power` |

**Gemini prompt (paste):**

> Pixel art icon: **rivalry flex** — two mirrored **biceps bump** creating shockwave pixels (generic silhouettes, no real likeness). Ascension medallion. Transparent background.

---

### `wizB_3.png` — **Magicaulyus Maximus**

| Field | Value |
|-------|-------|
| **Node ID** | `wizB_3` |
| **Effect** | `+10% ritual power` |

**Gemini prompt (paste):**

> Pixel art icon: **Roman epic magic parody** — **laurel wreath** wrapping a **flaming spell orb** with exaggerated grandeur sparks. Marble-white highlights optional as chunky pixels. Transparent background. No Latin text.

---

### `wizB_4.png` — **Washabungus Binliugngus**

| Field | Value |
|-------|-------|
| **Node ID** | `wizB_4` |
| **Effect** | `+15% ritual power` |

**Gemini prompt (paste):**

> Pixel art icon: **word-salad wizard relic** — tangled **scroll ribbons** forming a chaotic knot around a **glowing purple orb** with silly spark dribbles. Comedy nonsense aesthetic. Transparent background. No readable words.

---

### `wizB_5.png` — **Vintroclumus Latringus**

| Field | Value |
|-------|-------|
| **Node ID** | `wizB_5` |
| **Effect** | `+25% ritual power` |

**Gemini prompt (paste):**

> Pixel art icon: **grand finale latin-ish vibes without letters** — tall **tower wand** emitting layered **ring shockwaves** (concentric arcs). Mystic violet/gold palette. Transparent background.

---

### `wizB_6.png` — **Abra Cadabra**

| Field | Value |
|-------|-------|
| **Node ID** | `wizB_6` |
| **Effect** | `+30% ritual power`, capstone path node. |

**Gemini prompt (paste):**

> Pixel art icon: **classic magician payoff** — **white-glove hands** silhouette pulling a **rabbit-ear sparkle** out of a **top hat** as chunky pixels (avoid realistic fur detail). Burst stars. Transparent background. Do not spell “abra cadabra”.

---

## Wandering trader — rewards path (A)

### `traderA_1.png` — **Bum**

| Field | Value |
|-------|-------|
| **Node ID** | `traderA_1` |
| **Effect** | `+5% trader rewards` |

**Gemini prompt (paste):**

> Pixel art icon: **sympathetic hustle humor** — tiny **sleeping bag roll** + **coin cup** with one exaggerated glowing coin rising like hope spark (not mocking cruelty—cartoon wholesome-ish joke). Night blue tones. Transparent background. No text.

---

### `traderA_2.png` — **Why u buying ts?**

| Field | Value |
|-------|-------|
| **Node ID** | `traderA_2` |
| **Effect** | `+10% trader rewards` |

**Gemini prompt (paste):**

> Pixel art icon: **side-eye merchant joke** — chunky **mystery box** cracked open with **question-mark-shaped sparkle** formed by pixels (**not a typed question mark**—abstract curly glow). Warm lantern accent. Transparent background.

---

### `traderA_3.png` — **Wondering..**

| Field | Value |
|-------|-------|
| **Node ID** | `traderA_3` |
| **Effect** | `+15% trader rewards` |

**Gemini prompt (paste):**

> Pixel art icon: **wandering traveler** — **bindle stick** + **cloak silhouette** blowing in wind pixels + distant road sparkle arc. Moody but cute pixel proportions. Transparent background.

---

### `traderA_4.png` — **15$ For A Slice Of Bread**

| Field | Value |
|-------|-------|
| **Node ID** | `traderA_4` |
| **Effect** | `+20% trader rewards` |

**Gemini prompt (paste):**

> Pixel art icon: **price-gouging snack joke** — golden **toast slice** with **tiny crown sparkle** implying ridiculous luxury inflation comedy. Thick outlines. Transparent background. No readable prices.

---

### `traderA_5.png` — **The Hated**

| Field | Value |
|-------|-------|
| **Node ID** | `traderA_5` |
| **Effect** | `+25% trader rewards` |

**Gemini prompt (paste):**

> Pixel art icon: **infamous merchant** — **hooded figure** silhouette with **angry aura zigzags** as chunky pixels around a **money pouch** they clutch; comedy villain shade not scary gore. Transparent background. No text.

---

## Wandering trader — cheaper path (B)

### `traderB_1.png` — **Cheap Cheap**

| Field | Value |
|-------|-------|
| **Node ID** | `traderB_1` |
| **Effect** | `-10% trader prices` |

**Gemini prompt (paste):**

> Pixel art icon: **double discount vibe** — two overlapping **coupon ticket shapes** made abstract with **scissor-cut zigzag** edge and sparkle (no readable barcode). Bright bargain yellow/green palette. Transparent background.

---

### `traderB_2.png` — **Jouel Jouel**

| Field | Value |
|-------|-------|
| **Node ID** | `traderB_2` |
| **Effect** | `-15% trader prices` |

**Gemini prompt (paste):**

> Pixel art icon: **gem bargain pun** — chunky **jewel duo** mirrored with **price-down arrow pixels** formed abstractly by teal streaks (**no letters**). Transparent background.

---

### `traderB_3.png` — **Cannot Be Ts Homeless**

| Field | Value |
|-------|-------|
| **Node ID** | `traderB_3` |
| **Effect** | `-20% trader prices` |

**Gemini prompt (paste):**

> Pixel art icon: **housing luck joke** — tiny **pixel house silhouette** with **four-leaf clover sparkle** bolted like a charm on roof; wholesome comedy tone. Transparent background. No text.

---

### `traderB_4.png` — **Discoutus Masicmos**

| Field | Value |
|-------|-------|
| **Node ID** | `traderB_4` |
| **Effect** | `-25% trader prices` |

**Gemini prompt (paste):**

> Pixel art icon: **maximum coupon absurdity** — **wax seal badge** exploding into **discount spark shards** (abstract geometric triangles). Royal purple accents. Transparent background. No readable words.

---

## Trinkets path

### `trinket_a1.png` — **Firs Time Collector**

| Field | Value |
|-------|-------|
| **Node ID** | `trinket_a1` |
| **Effect** | `+20% trinket effects` |

**Gemini prompt (paste):**

> Pixel art icon: **starter collector** — **glass jar** containing one chunky **sparkling charm** like first loot trophy; cozy beginner vibe (typo “Firs” energy = humble pine needle sparkle optional abstract). Transparent background. No text.

---

### `trinket_a2.png` — **Divine Enchatment**

| Field | Value |
|-------|-------|
| **Node ID** | `trinket_a2` |
| **Effect** | `+50% trinket effects` |

**Gemini prompt (paste):**

> Pixel art icon: **holy enchantment** — floating **scroll halo** wrapped by **golden particle orbit** around a **gem centerpiece**. Radiant soft bloom pixels (still chunky). Transparent background. No readable glyphs.

---

### `trinket_a3.png` — **Queen Victoria**

| Field | Value |
|-------|-------|
| **Node ID** | `trinket_a3` |
| **Effect** | `+100% trinket effects` |

**Gemini prompt (paste):**

> Pixel art icon: **regal relic humor** — stylized **crown** merged with **brooch gemstone** and lace-like pixel flourishes (**generic royalty**, not historical portrait). Transparent background.

---

### `trinket_a4.png` — **Eternal Infusion**

| Field | Value |
|-------|-------|
| **Node ID** | `trinket_a4` |
| **Effect** | `+150% trinket effects` |

**Gemini prompt (paste):**

> Pixel art icon: **endless brew enchantment** — **hourglass** filled with **liquid light pixels** looping upward impossibly; glow drip sparks. Fantasy teal/violet palette. Transparent background.

---

### `trinket_a5.png` — **Arcane Empowrement**

| Field | Value |
|-------|-------|
| **Node ID** | `trinket_a5` |
| **Effect** | `+250% trinket effects`, capstone branch node. |

**Gemini prompt (paste):**

> Pixel art icon: **capstone arcane surge** — **spell circle ring** lifting multiple **floating rune shards** (**abstract shapes only**) blasting upward empowerment beams chunky pixels. Transparent background.

---

## Luck path (missing nodes only)

### `luck_2.png` — **Lucky Clover**

| Field | Value |
|-------|-------|
| **Node ID** | `luck_2` |
| **Effect** | `+1.5 luck` |

**Gemini prompt (paste):**

> Pixel art icon: bold **four-leaf clover** as chunky pixel emblem with **gold shimmer outline** and tiny orbiting sparkle dots; readable silhouette at small size. Transparent background. No text.

---

### `luck_4.png` — **Arthur The Great**

| Field | Value |
|-------|-------|
| **Node ID** | `luck_4` |
| **Effect** | `+4 luck` |

**Gemini prompt (paste):**

> Pixel art icon: **generic legendary king motif** — simple **pixel sword in stone** silhouette with **blue royal mantle swirl** suggested by chunky cloth pixels (**no copyrighted Arthur depiction**). Transparent background. No text.

---

### `luck_5.png` — **Luckyest One**

| Field | Value |
|-------|-------|
| **Node ID** | `luck_5` |
| **Effect** | `+7 luck` |

**Gemini prompt (paste):**

> Pixel art icon: **ultimate luck arrogance joke** — **#1 trophy shape formed abstractly** using **gold pillar + star burst** **without digits or letters**. Cartoon shine arc across icon. Transparent background.

---

### `luck_6.png` — **Blessed Odds**

| Field | Value |
|-------|-------|
| **Node ID** | `luck_6` |
| **Effect** | `+4 luck` |

**Gemini prompt (paste):**

> Pixel art icon: **cosmic roulette blessing** — chunky **pair of dice** floating inside **halo ring** made of spark pixels (abstract luck tuning vibe). Transparent background. No pips drawn too tiny—use bold chunky dots.

---

## Drop chance path (missing nodes only)

### `drop_1.png` — **Tresure Seeker**

| Field | Value |
|-------|-------|
| **Node ID** | `drop_1` |
| **Effect** | `+0.5 drop chance` |

**Gemini prompt (paste):**

> Pixel art icon: **treasure hunter starter** — **map scroll** with **glowing X mark** formed only by crossed sticks sparkle (**not letter X typography**) + tiny shovel silhouette. Transparent background.

---

### `drop_2.png` — **Tresure Overflow**

| Field | Value |
|-------|-------|
| **Node ID** | `drop_2` |
| **Effect** | `+1.5 drop chance` |

**Gemini prompt (paste):**

> Pixel art icon: **loot explosion** — **chest cracking open** with coins/gems bursting in chunky arc pixels (controlled composition, single focal chest). Transparent background.

---

### `drop_3.png` — **Jouel Sense**

| Field | Value |
|-------|-------|
| **Node ID** | `drop_3` |
| **Effect** | `+3 drop chance` |

**Gemini prompt (paste):**

> Pixel art icon: **jewel intuition pun** — stylized **eye silhouette** replaced by a **large gemstone lens** with sparkle scans emitting cone pixels (psychic loot radar joke). Transparent background. No readable eye detail—keep iconic.

---

### `drop_4.png` — **Divine Chances**

| Field | Value |
|-------|-------|
| **Node ID** | `drop_4` |
| **Effect** | `+7 drop chance` |

**Gemini prompt (paste):**

> Pixel art icon: **heavenly RNG buff** — **beam of light** hitting a **spinning loot orb** with feather-soft halo pixels around edges (still chunky pixel style). Transparent background. No angels with faces—silhouettes OK.

---

## Prism / Light path (missing nodes only)

### `prism_1.png` — **Reflaction**

| Field | Value |
|-------|-------|
| **Node ID** | `prism_1` |
| **Effect** | `+15% Yates meter fill rate` |

**Gemini prompt (paste):**

> Pixel art icon: **typo-refraction joke** — chunky **triangular prism** splitting a white beam into **short chunky rainbow stripes** bending wrong funny angle (playful imperfect physics). Transparent background. No text.

---

### `prism_2.png` — **Bandy**

| Field | Value |
|-------|-------|
| **Node ID** | `prism_2` |
| **Effect** | `+35% Yates meter fill rate` |

**Gemini prompt (paste):**

> Pixel art icon: **band / ribbon light** — swirling **neon ribbon arc** orbiting a **glowing core orb** like cheerful mana chunk candy colors but readable silhouette. Transparent background.

---

### `prism_3.png` — **Light + Light = Ligheter**

| Field | Value |
|-------|-------|
| **Node ID** | `prism_3` |
| **Effect** | `+60% Yates meter fill rate` |

**Gemini prompt (paste):**

> Pixel art icon: **math joke illumination** — two **small sun-orbs** colliding into an **even brighter mega orb** with cartoon lens flare pixels (**no equations typed**). Transparent background.

---

### `prism_5.png` — **KA-tchin thicn tchin!**

| Field | Value |
|-------|-------|
| **Node ID** | `prism_5` |
| **Effect** | `+166% Yates meter fill rate`, capstone title **Geometry correct** vibe. |

**Gemini prompt (paste):**

> Pixel art icon: **capstone rhythmic sparkle explosion** — abstract **sound-wave zigzag** crossing a **prism burst** like musical geometry (**onomatopoeia vibe without letters**). Big playful fireworks pixels. Transparent background.

---

## Damage path (still missing icons)

### `dmg_4.png` — **50 Push Ups**

| Field | Value |
|-------|-------|
| **Node ID** | `dmg_4` |
| **Effect** | `+70% damage` |

**Gemini prompt (paste):**

> Pixel art square emblem: **training montage joke** — chunky silhouette doing **push-up pose** simplified into **badge shape**, sweat sparkle pixels, optional tiny **“50” vibe suggested by five stacked tally marks made of bones/clicks** — **IMPORTANT:** **do not render readable numbers**; use abstract tally chunks instead. Gym comic palette (orange/grey). Transparent background.

---

### `dmg_5.png` — **Very Very Strong**

| Field | Value |
|-------|-------|
| **Node ID** | `dmg_5` |
| **Effect** | `+90% damage` |

**Gemini prompt (paste):**

> Pixel art icon: **double-power gag** — **two flexed bicep arcs** mirrored stacking vertically inside a **shield medallion**, vibrating motion lines implying excess strength comedy. Thick outlines. Transparent background.

---

### `dmg_7.png` — **Too Strong**

| Field | Value |
|-------|-------|
| **Node ID** | `dmg_7` |
| **Effect** | `+150% damage` |

**Gemini prompt (paste):**

> Pixel art icon: **breaking limits** — **cracked medal** with glowing fractures emitting hot sparks; tiny warning triangles as abstract pixels (**no text**). Bold silhouette readable small. Transparent background.

---

### `dmg_8.png` — **No Need For That Much**

| Field | Value |
|-------|-------|
| **Node ID** | `dmg_8` |
| **Effect** | `+200% damage` |

**Gemini prompt (paste):**

> Pixel art icon: **overkill comedy** — enormous **cartoon fist** descending toward a **tiny harmless rock/pebble** with exaggerated shockwave ring; humorous scale mismatch. Transparent background.

---

## Click speed path (still missing icons)

### `click_4.png` — **Clickly Clockly**

| Field | Value |
|-------|-------|
| **Node ID** | `click_4` |
| **Effect** | `+55% click speed` |

**Gemini prompt (paste):**

> Pixel art icon: **cursor meets clock rhythm** — chunky **mouse pointer** overlapping a **round clock disk** simplified (no numerals), motion ticks suggested by pixel wedges; springy teal/yellow accents. Transparent background.

---

### `click_5.png` — **Click Click Click**

| Field | Value |
|-------|-------|
| **Node ID** | `click_5` |
| **Effect** | `+70% click speed` |

**Gemini prompt (paste):**

> Pixel art icon: **triple-click ripple** — three concentric **impact rings** from a central pointer smash with fading ghost pointers (**three staggered silhouettes**). Arcade energy. Transparent background.

---

### `click_6.png` — **Click More**

| Field | Value |
|-------|-------|
| **Node ID** | `click_6` |
| **Effect** | `+95% click speed` |

**Gemini prompt (paste):**

> Pixel art icon: **plus-click encouragement** — oversized pointer with **spark explosions shaped like plus bursts** (four chunky beams). Friendly idle-game dopamine vibe. Transparent background. No plus symbol typography—use chunky pixel beams only.

---

## Antimatter path (still missing icon)

### `anti_2.png` — **-Ness**

| Field | Value |
|-------|-------|
| **Node ID** | `anti_2` |
| **Effect** | `+35% antimatter fill rate` |

**Gemini prompt (paste):**

> Pixel art ascension chip: **sequel darkness companion** to a sci-fi **void condenser** vibe — swirling **purple-black vortex** eating its own outline (**abstract “minus presence”**). Thin neon violet rim glow only on outer ring; tiny drifting shadow particles inward. Cute-chunky proportions (idle game). Transparent background. **Absolutely no letters**, no creepy realism.

---

## Master checklist (all files in this doc)

Copy exported PNGs to `public/game/ascension/`:

**Origin:** `origin.png`

**Building:** `build_1.png` … `build_10.png`

**Bank:** `bank_1.png` … `bank_5.png`

**Wizard A:** `wizA_1.png` … `wizA_6.png`

**Wizard B:** `wizB_1.png` … `wizB_6.png`

**Trader A:** `traderA_1.png` … `traderA_5.png`

**Trader B:** `traderB_1.png` … `traderB_4.png`

**Trinkets:** `trinket_a1.png` … `trinket_a5.png`

**Luck:** `luck_2.png`, `luck_4.png`, `luck_5.png`, `luck_6.png`

**Drops:** `drop_1.png` … `drop_4.png`

**Prism:** `prism_1.png`, `prism_2.png`, `prism_3.png`, `prism_5.png`

**Damage:** `dmg_4.png`, `dmg_5.png`, `dmg_7.png`, `dmg_8.png`

**Click:** `click_4.png`, `click_5.png`, `click_6.png`

**Antimatter:** `anti_2.png`

**Total:** 62 icons listed above.

---

## Already have icons (do not regenerate)

Examples wired today: money `money_1–10`, damage partial `dmg_1–3,6,9–10`, click partial `click_1–3,7–10`, antimatter partial `anti_1,3–5`, prism `prism_4` (Dabura), AFK demons/angels, luck `luck_1,3,7`, drops `drop_5–7`, Gilgamesh treasury title uses `gilgamesh.png`.
