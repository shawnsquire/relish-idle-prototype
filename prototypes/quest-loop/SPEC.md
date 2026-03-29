# Quest Loop Prototype — Spec (v2)

## Hypothesis
Does the "raise bodies on the field NOW vs WAIT for more" tension feel like a meaningful choice during a quest?

## Key Design Insight (from v1 testing)
Materials aren't abstract inventory — they're BODIES on the battlefield. You're a necromancer. Enemies die, their bodies pile up, you cast spells on the bodies to raise them as undead. Bodies you don't raise just rot. This eliminates the "leftover materials" problem and creates natural thematic tension.

## Resource Model
- Enemies die → their body stays on the field (typed: "villager body", "knight body", etc.)
- Bodies accumulate visibly: "Bodies: 3 villager, 1 knight, 1 demon"
- Spells consume bodies: "Revenant costs 1 body, Bone Construct costs 4 bodies"
- Body TYPE is a power modifier: knight body → stronger result than villager body
- Spell determines the undead TYPE, body determines the POWER
- Raised undead joins your army immediately (and can die too)
- Unraised bodies rot when quest ends — no hoarding

## The Core Tension
Raise NOW: quick, weaker undead, helps you survive the current wave.
WAIT: risky (you might die while bodies pile up), but combine more/better bodies into something powerful.

## Screens

### 1. Collection / Jar Selection
- Simple table of ~100 undead (name, type, power — one number)
- Jar has a hard count limit (debug-adjustable)
- Click to add/remove from jar
- "Start Quest" button
- Shows general enemy preview

### 2. Quest (the core test)
**Layout:**
- **Top: Status bar** — "Your army: 14 undead | Wave 7 | Bodies on field: 3 villager, 1 knight"
- **Middle: Log feed** — scrolling text. "Wave 5: 3 Knights approach... Knight killed! Body on field. Your Zombie (pow 4) died."
- **Bottom: Spell list** — table of all spells. Shows: name, body cost (e.g., "2 bodies"), can-cast indicator. Spell buttons LIGHT UP when you have enough bodies. Click to cast — consumes bodies, raises undead, logged.
- **Side: Debug panel**

**Auto-combat (setInterval, speed-adjustable):**
- Enemies appear in waves, escalating
- Your undead fight enemies — both sides die over time (dice rolls)
- Dead enemies become bodies on the field
- Dead player undead are just gone

**Spells:**
- Each spell has: name, body cost (number of bodies needed), output undead type
- Power of summoned undead = spell base × average body quality (villager=1, guard=2, knight=3, paladin=4, demon=5)
- Spell buttons are ALWAYS visible, greyed out when you can't afford them, lit up when you can
- Click to cast. Consumes the best available bodies first (or worst? test both with debug toggle)
- No hold-to-charge — the "bigger" version comes from waiting for better bodies, not holding a button

**Last Chance:** When quest ends (boss dies / retreat), if bodies remain on field, you get one final cast opportunity before leaving.

**Quest ends when:**
- Boss killed → special drop + last chance cast
- All undead die + no bodies to raise → quest failed
- Player retreats → last chance cast on remaining bodies

### 3. Loot Selection
- All surviving undead (jar originals that lived + quest-raised undead)
- Jar capacity limit — pick what to keep
- Special drops noted if boss killed
- Return to collection

## Feedback (fixing v1 problem)
- Body count is PROMINENT — big text, updates visually on each kill
- Spell buttons change state clearly (greyed → lit) when affordable
- Log gives clear cause-and-effect: "Knight killed → body on field (knight, quality 3)"
- Casting gives immediate feedback: "Cast Revenant on knight body → Revenant (power 9) joins your army!"

## Debug Controls (first-class)
- Time speed slider (1x–10x)
- Jar capacity adjuster
- Enemy strength multiplier
- Skip to boss
- Body consumption order toggle (best-first vs worst-first)
- +5 bodies button (for testing spells without waiting)
- Reset

## NOT in this prototype
- Essence/currency
- Visual polish, portraits, animations
- Tier colors or tier systems
- Cost scaling or economy balancing
- Hold-to-charge mechanic (cut — bodies replace this)
- Upgrade buttons
