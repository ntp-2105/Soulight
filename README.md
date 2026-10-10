# Soulight

A standalone top-down browser combat prototype built with TypeScript, Phaser, and Vite with a locally packaged fantasy pixel-art presentation.

## Run locally

Requirements: Node.js 22.12 or newer and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Production output can be generated with `npm run build` and served with `npm run preview`.

### Online rooms (milestone 2)

Online play also needs the .NET 10 SDK. Run the game server in a second terminal:

```bash
npm run server
```

The server listens on `http://localhost:5080`, and Vite proxies `/ws` to it. In the lobby, choose **Host online room**. The address bar then shows `?room=CODE`; open that URL in up to three more tabs or browsers to join the same room.

Each player still runs its own local combat. The server owns room membership and spawn points, and it validates and records each player's input. Other players appear at their spawn point and do not move yet; world snapshots arrive in milestone 3.

## Controls

| Input | Action |
|---|---|
| W / A / S / D or arrow keys | Move and aim (you face the way you move) |
| Hold Space | Attack |
| Shift | Ability |
| E | Interact |
| 1 | Apprentice Wand |
| 2 | Ember Staff |
| 3 | Knight's Blade |
| R or Enter | Restart after victory or defeat |

Defeat all eight Chasers to clear the room. Chasers deal contact damage; the run ends if the player's core reaches zero health.

Manual Aim fires in the direction you are moving, or the last direction you moved when standing still. Auto Aim automatically targets the nearest living enemy, then attacks at the equipped weapon's normal cooldown while Space is held. The mouse is only used for UI buttons. The selected mode can be changed in the lobby or during combat and is remembered across browser sessions.

## Architecture

```text
src/
├── data/                    # Central balance definitions
├── game/
│   ├── scenes/              # Boot, offline lobby, and dungeon orchestration
│   ├── entities/            # Player, enemy, projectile, damage contract
│   ├── renderers/           # Entity-specific visual presentation
│   ├── systems/             # Combat, weapons, effects, waves, game flow
│   ├── input/               # Keyboard command adapter
│   └── ui/                  # HUD and state overlays
├── gameplay/weapons/        # Weapon schema and pure combat geometry
└── network/                 # WebSocket room session

server/
├── Soulight.Server/         # ASP.NET Core WebSocket server: rooms, join, input
└── Soulight.Server.Tests/   # xUnit tests for room and input rules
```

The scene coordinates modules but does not contain balance data or weapon/collision rules. `BootScene` loads a typed local asset manifest and blocks startup if a required file is missing. The game makes no runtime requests to external asset hosts.

## Art and licensing

The fantasy sprites, dungeon tiles, interface, prompts, crosshair, effects, and font are curated from CC0 Kenney packs and vendored under `public/assets`. See [`ASSET_SOURCES.md`](ASSET_SOURCES.md) for exact source files and mappings. Original license texts are retained under `public/assets/licenses`.

All visual assets load locally, so the game remains playable without an internet connection after installation.

## Verification

```bash
npm run check
```

This runs strict TypeScript checking, the Vitest suite, and a production build. Run the server tests with `npm run server:test`.

## Milestone boundary

This build includes milestone 2: room creation and join over WebSocket, server-assigned spawns, and input messages. It intentionally excludes server simulation and world snapshots (milestone 3), procedural room graphs, character abilities, inventory/pickups, revive, bosses, persistence, and audio. Those belong to later milestones in the technical specification.
