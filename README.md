# Relish Idle Prototype

A web-based semi-idle game prototype featuring horde combat mechanics and town management.

## Features Implemented

### Combat Phase
- **Player**: Static block representing your base
- **Minion Horde**: Small zombies/skeletons that spawn around the player
  - Automatically rush to attack enemies
  - Simple flocking behavior for horde feel
  - Scales with bonuses from town jobs
- **Enemies**: Spawn at the top of the screen and move down
  - Health bars showing damage
  - Get swarmed and destroyed by minions
- **Timer**: 30-second quests with automatic phase transition

### Town Phase
- **3 Buildings** with 3 jobs each:
  - **Smithy**: Increases minion damage and speed
  - **Crypt**: Summons more minions
  - **Inn**: Generates gold (currently unused)
- **Job Assignment**: Assign/unassign minions to jobs with +/- buttons
- **Resource Display**: Shows available minions, gold, and total kills
- **Start Quest Button**: Returns to combat with remaining minions

### Progression Loop
1. Combat for 30 seconds, minions kill enemies
2. Timer expires → Town phase
3. Assign minions to jobs (they won't fight in next quest)
4. Start new quest with bonuses applied
5. Collect job rewards and repeat

## Running the Game

```bash
# Start dev server
npm run dev

# Build for production
npm build

# Preview production build
npm run preview
```

The game runs at **http://localhost:5173/**

## Mobile Optimization

- Full-screen canvas rendering
- Touch-friendly UI buttons
- Prevents pull-to-refresh
- Viewport locked (no zoom)
- Responsive to screen size

## Tweaking Game Balance

All game numbers are in `src/game/Config.ts`:
- Combat duration
- Enemy spawn rates
- Minion speed, damage, count
- Enemy health
- Job bonuses and requirements

## Project Structure

```
src/
├── main.ts                 # Entry point, canvas setup
├── style.css              # Mobile-first styling
├── game/
│   ├── Config.ts          # All tweakable numbers
│   ├── GameState.ts       # State management
│   ├── GameLoop.ts        # Main update/render loop
│   └── phases/
│       ├── CombatPhase.ts # Combat logic
│       └── TownPhase.ts   # Town UI management
└── entities/
    ├── Player.ts          # Player block
    ├── Minion.ts          # Minion with AI
    └── Enemy.ts           # Enemy with health
```

## Tech Stack

- **Vite**: Fast development and hot-reload
- **TypeScript**: Type safety and better IDE support
- **HTML Canvas**: High-performance rendering for hundreds of entities
- **Vanilla CSS**: Lightweight mobile-first styling

## Next Steps / Ideas

- Add more enemy variety (size, speed, health)
- Implement gold usage (upgrades, buildings)
- Add visual effects (particles, screen shake)
- More complex minion behavior (formations, special abilities)
- Sound effects and music
- Save/load game state
- Prestige/reset mechanics
- Boss encounters
