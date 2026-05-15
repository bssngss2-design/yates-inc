# YATES INC. GAME — MASTER PLAN

---

## PHASE 1: BUG FIXES (do first)

### 1. Bank Loan Bug
- Loan state not saving to Supabase — refreshing page erases the loan, free money exploit
- Fix: persist loan data (amount, interest, timestamp) to database
- Bump interest to 450%

### 2. Bank Interest — Only While Playing
- Interest should only accrue while the game tab is open
- No more AFK banking

### 3. Roulette Desync Bug
- Animation lands on one slot but gives reward from 2 slots away
- Fix: sync the visual rotation endpoint with the reward index

### 4. Trader Bugs
- Permanent upgrades reappearing after purchase (not tracked in save state)
- Purchased permanent upgrades not affecting bonuses
- Roulette sometimes not showing in trader offers
- Trader quest to unlock better deals doesn't save progress
- Fix: trader "% of your money" pricing should check wallet + bank balance

### 5. Buildings Not Giving Miners
- Mines, Factories, Wizard Towers show as owned but "0 miners" and no mining happening
- Investigate whether passive income is silently working or genuinely broken

### 6. Time Warp Powerup
- Does nothing. Fix the calculation in GameContext.tsx

### 7. Powerup Spam
- Can spam powerups infinitely (store money in bank, pop Golden Touch 50x, cash out)
- Fix: add cooldown timer or limited charges per powerup

### 8. Remove Coupons from Normal Mode
- Coupons were supposed to be replaced by lottery tickets
- Nuke all coupon references from normal mode
- Keep coupons only in hard mode

---

## PHASE 2: QoL IMPROVEMENTS

### 1. Progressive Feature Unlocking
Features hidden until player hits requirement, then they appear:

| Feature | Unlock Requirement |
|---|---|
| Pickaxe Shop | Can afford first pickaxe OR 10+ prestiges |
| Mine | 200K$ |
| Gem Farm (new) | 1M$ |
| Factory | 1.5M$ |
| Alchemy Lab (new) | 10M$ |
| Trinkets | 2 prestiges + 100K$ |
| Upgrades & Powerups | 5B$ |
| Shady Sam | Prestige 5 + 500K$ |
| Lottery | Prestige 5 |
| Bank | 10B$ |
| Stokens | Prestige 10 |
| Path (Light/Dark) | Prestige 11 |
| Wizard Tower | 5T$ |

Each unlock shows an in-game explanation of the feature.

### 2. Percentage Breakdown
- Add expandable dropdown next to each bonus stat
- Shows where each % comes from (prestige, trinkets, upgrades, buildings, etc.)
- Sailor Piece stat screen style

### 3. Collapsible UI
- Right sidebar (buildings) is fully collapsible with an arrow toggle
- Bonuses panel gets its own dedicated location

### 4. Custom Buy Amounts
- Add text input field for miners/buildings so you can type exact amounts (e.g. buy 23 miners)

### 5. Building Order
- Sort buildings by price (cheapest first)
- New mid-tier buildings fill the price gaps (see Phase 3)

---

## PHASE 3: NEW BUILDINGS

All buildings sorted by price. "See at" = when the building appears in the sidebar.

| # | Building | Price | See At | Path | What It Does |
|---|---|---|---|---|---|
| 1 | Mine | 200K$ | 200K$ | Any | 20 miner-equivalents of passive income each |
| 2 | Gem Farm | 7M$ | 1M$ | Any | Grows gems passively. 1 gem = 500$, 1 gem/min. Gem pops out with +1 animation |
| 3 | Factory | 1.5M$ | 1.5M$ | Any | +10 bonus miners each, random timed buffs |
| 4 | Alchemy Lab | 50M$ | 10M$ | Any | Every 100 clicks → +5% money bonus for 5sec (stacks) |
| 5 | Time Machine | 5B$ | 1B$ | Any | Harvests money from the past/future |
| 6 | Bank | 10B$ | 10B$ | Any | Deposits, compound interest, loans |
| 7 | Antimatter Condenser | 60B$ | 20B$ | DARK | Antimatter meter: each miner = 0.5%. At 100%: +120% money, "The Villain" title, WT 2x faster spawn, cookies 2x faster, wizard tower 2x cheaper, talismans 2x stronger. Extra sources: cookies +1%, talisman +3%, all talismans +10%, 66 prestiges +20%. Resets after 8 min |
| 8 | Prism | 550B$ | 225B$ | LIGHT | Yates meter to 100%: +2x all stats, bank interest x10. Sources: pray +0.5%, cookie +1%, all relics +10%, prestige 7+ permanent +7%, temple rank 2 permanent +5%, temple rank 3 permanent +10%. Lasts 7 min |
| 9 | Shipment | 50T$ | 50T$ | Any | Portal delivers random loot on a timer (5-30 min). Rewards: exotic rocks (30%), trinkets (15%), prestige tokens (10%), money (40%), titles (5%). More shipments = faster deliveries |
| 10 | Wizard Tower | 5T$ | 5T$ | DARK | Shadow miners, dark rituals |
| 11 | Temple | — | — | LIGHT | 1.5x miner money, prayer system, golden cookies |
| 12 | Chancemaker | 6T$ | 1T$ | Any | Every 20sec per building: 5.5% chance to give ANY random buff for 20sec-5min |
| 13 | Fractal Engine | 50T$ | 10T$ | Any | Base 15B$/sec. +1% per building owned (WT/Temple/Bank = +5% each). +0.5% per pickaxe owned |

---
, mnbvc     
## PHASE 4: SHADY SAM REWORK — Mystery Boxes

Sam no longer does stat swaps. He sells Mystery Boxes at 3 risk tiers.

### Sketchy Box
- **Cost:** cheap
- **Good outcomes:** small buff for 5 min, some cash
- **Bad outcomes:** nothing
- **Assets:** `sketchyboxCLOSED.png`, `SketchyboxOPEN.png`

### Suspicious Crate
- **Cost:** medium
- **Good outcomes:** decent buff, 5 stokens, random trinket
- **Bad outcomes:** lose 10% of your money (wallet + bank)
- **Assets:** `SuspicuesCrateClosed.png`, `SuspiciusCrateOpen.png`

### Cursed Chest
- **Cost:** expensive
- **Good outcomes:** massive buff, rare trinket, 20 stokens
- **Bad outcomes:** lose 30% of your money (wallet + bank) + a debuff
- **Assets:** `CursedChestClosed.png`, `CursedChestOpenGood.png`, `CursedChestOpenBad.png`

---

## PHASE 5: SHIPMENT SYSTEM & EXOTIC ROCKS

### Shipment UI Flow
1. Click `shipment.png` icon in buildings sidebar
2. Shipment Modal opens
3. While waiting: `shipmentportalclosed.png` as header, glowing timer text below
4. When delivery arrives: header swaps to `shipmentportal.png` (portal active), "Collect Delivery" button appears
5. Collect → get reward → portal closes, new timer starts

### Exotic Rocks
When shipment delivers an exotic rock, it temporarily replaces your current rock. Break it = big payout, then back to normal rock. 3 HP stages each (100%, 70%, 30%).

| Rock | Base HP | $/Click | Break Reward | Assets |
|---|---|---|---|---|
| Clown Rock | 100M | 120M$ | 1B$ | `Clownrock.png`, `Clown70%HP.png`, `Clown30%HP.png` |
| Schavitsky's Rock | 500M | 350M$ | 5B$ | `Schavitsky's rock.png`, `Schavitsky's rock 70% HP.png`, `Schavitsky's 30%.png` |

---

## NOT DOING
- Lore/dialogue (nah)
- New titles (nah)
- PWA/downloadable (last priority)
- Trinket duplication on conversion (not a problem)
- Trinket RNG changes (intentional — Yates appearing always is on purpose)

---

## ASSET CHECKLIST

| Asset | File | Status |
|---|---|---|
| Sketchy Box Closed | `sketchyboxCLOSED.png` | DONE |
| Sketchy Box Open | `SketchyboxOPEN.png` | DONE |
| Suspicious Crate Closed | `SuspicuesCrateClosed.png` | DONE |
| Suspicious Crate Open | `SuspiciusCrateOpen.png` | DONE |
| Cursed Chest Closed | `CursedChestClosed.png` | DONE |
| Cursed Chest Open Good | `CursedChestOpenGood.png` | DONE |
| Cursed Chest Open Bad | `CursedChestOpenBad.png` | DONE |
| Shipment Icon | `shipment.png` | DONE |
| Shipment Portal Open | `shipmentportal.png` | DONE |
| Shipment Portal Closed | `shipmentportalclosed.png` | DONE |
| Clown Rock 100% | `Clownrock.png` | DONE |
| Clown Rock 70% | `Clown70%HP.png` | DONE |
| Clown Rock 30% | `Clown30%HP.png` | DONE |
| Schavitsky's Rock 100% | `Schavitsky's rock.png` | DONE |
| Schavitsky's Rock 70% | `Schavitsky's rock 70% HP.png` | DONE |
| Schavitsky's Rock 30% | `Schavitsky's 30%.png` | DONE |
| Gem Farm icon | — | NEEDED |
| Alchemy Lab icon | — | NEEDED |
| Time Machine icon | — | NEEDED |
| Antimatter Condenser icon | — | NEEDED |
| Prism icon | — | NEEDED |
| Chancemaker icon | — | NEEDED |
| Fractal Engine icon | — | NEEDED |
