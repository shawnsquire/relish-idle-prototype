# Quest Loop Prototype — Findings

## Hypothesis
Does the "raise bodies on the field NOW vs WAIT for more" tension feel like a meaningful choice during a quest?

## Answer: Partially. The tension exists but the choices don't feel impactful enough yet.

## What Worked

**Bodies-as-resource model.** Enemies die, bodies pile up, you raise them or they rot. Thematically clean for a necromancer. No "leftover materials" problem — unraised bodies just disappear at quest end.

**Spell effectiveness vs enemy types.** Seeing upcoming waves tagged [Armored, Holy] and knowing which spells counter them creates real decision moments. Gold highlighting for "strong vs current" was the right feedback.

**Collection safety on loss.** Wiping kills jar picks only. Home collection is untouched. Loss stings ("I lost my best Revenant") without feeling helpless. Quests = high risk/high reward. Town/downtime = safe slow growth (not prototyped, but the model works).

**Last chance cast.** Getting one final spell before leaving felt fun and dramatic. Should happen right before the boss, not just at quest end.

**Vague wave descriptors.** "A tactical Crusader shield wall [Armored, Holy]" instead of exact numbers. Gives flavor the player learns to associate over time.

## What Didn't Work

**Raise-now-vs-wait tension is too weak.** 1-body spells are almost always affordable, so there's rarely a reason to wait. Needs scarcer bodies + more expensive spells being clearly better to force real tradeoffs.

**Boss combat is unsatisfying.** Either crumples instantly or devours everything. Needs its own mechanic — not just "same combat but more HP." This is a separate prototype.

**Body type distinction is too flat.** Knight body vs villager body is just +2 quality. Should feel meaningfully different — maybe different bodies enable different spells, or body type affects the undead's abilities, not just a power number.

**Too many spells to scan.** 12 spells as a flat list is overwhelming mid-combat. Contextual filtering (only show castable / relevant) would help, but may not be the right UI for the final game.

**Pacing is hard to nail.** Combat was either instant or glacial. Debug sliders helped iterate but the "right" pacing depends on how much player agency there is per wave.

**Multi-quest loop barely tested.** Most runs either wiped or ended without filling the jar. The "does your collection evolve interestingly over 5+ runs" question is still open.

## Design Insights Discovered

1. **Three growth paths:** Quests (powerful, risky), Town (sustained, safe), Downtime/idle (slow baseline like running a cemetery). These don't need to be in one prototype.

2. **Bodies on the field are the resource, not abstract materials.** This was the key v1→v2 insight. You're a necromancer — you raise what's there.

3. **Body type should matter for spell eligibility, not just power scaling.** "I need a demon body for Flesh Golem" is more interesting than "any 5 bodies = Flesh Golem."

4. **The jar creates interesting curation pressure** but only when it's too small for everything you want. Needs quests that generate MORE good undead than you can carry.

5. **Loss is fine if there's a safe baseline.** Players accept losing jar picks if the collection is protected and there's a non-quest path to rebuild.

## Open Questions for Future Prototypes

- How should boss fights work as their own mechanic? (→ Boss Encounters prototype)
- Does body type gating (specific bodies for specific spells) make casting more or less fun?
- Does the multi-quest collection evolution feel like progression over 5-10 runs?
- How does the "last chance before boss" moment play out with more dramatic presentation?
- What does the town/downtime loop look like that provides safe baseline growth?
