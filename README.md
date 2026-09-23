# Soulight

A standalone top-down browser combat prototype built with TypeScript, Phaser, and Vite with a locally packaged fantasy pixel-art presentation.

## Run locally

Requirements: Node.js 22.12 or newer and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Production output can be generated with `npm run build` and served with `npm run preview`.

## Controls

| Input | Action |
|---|---|
| W / A / S / D | Move |
| Mouse | Aim |
| Hold left mouse | Attack |
| 1 | Apprentice Wand |
| 2 | Ember Staff |
| 3 | Knight's Blade |
| R or Enter | Restart after victory or defeat |

Defeat all eight Chasers to clear the room. Chasers deal contact damage; the run ends if the player's core reaches zero health.

## Architecture

```text
src/
├── data/                    # Central balance definitions
├── game/
│   ├── scenes/              # Boot, offline lobby, and dungeon orchestration
│   ├── entities/            # Player, enemy, projectile, damage contract
│   ├── renderers/           # Entity-specific visual presentation
│   ├── systems/             # Combat, weapons, effects, waves, game flow
│   ├── input/               # Keyboard/mouse command adapter
│   └── ui/                  # HUD and state overlays
└── gameplay/weapons/        # Weapon schema and pure combat geometry
```

The scene coordinates modules but does not contain balance data or weapon/collision rules. `BootScene` loads a typed local asset manifest and blocks startup if a required file is missing. The game makes no runtime requests to external asset hosts.

## Art and licensing

The fantasy sprites, dungeon tiles, interface, prompts, crosshair, effects, and font are curated from CC0 Kenney packs and vendored under `public/assets`. See [`ASSET_SOURCES.md`](ASSET_SOURCES.md) for exact source files and mappings. Original license texts are retained under `public/assets/licenses`.

All visual assets load locally, so the game remains playable without an internet connection after installation.

## Verification

```bash
npm run check
```

This runs strict TypeScript checking, the Vitest suite, and a production build.

## Milestone boundary

This build intentionally excludes servers, networking, multiplayer, procedural room graphs, character abilities, inventory/pickups, revive, bosses, persistence, and audio. Those belong to later milestones in the technical specification.
