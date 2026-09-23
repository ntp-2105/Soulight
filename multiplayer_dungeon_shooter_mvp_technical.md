# Multiplayer Dungeon Shooter — MVP Technical Specification
## Technical Developer Version

**Working concept:** Browser-based 1–4 player cooperative top-down action roguelite.

**Target stack**
- Client: TypeScript + Phaser
- Server: C# + .NET / ASP.NET Core
- Primary real-time transport: WebSocket over TLS
- Persistence: PostgreSQL (initially optional for a pure run prototype)
- Deployment target: containerized Linux server

---

# 1. MVP Scope

## 1.1 Functional requirements

The MVP SHALL support:

- 1–4 players per game room.
- Desktop browser keyboard/mouse controls.
- Real-time movement and aiming.
- Server-authoritative combat.
- Three character archetypes.
- Three weapons.
- Three enemy archetypes.
- One boss.
- Procedurally assembled dungeon.
- Weapon pickup/equip/drop flow.
- Character abilities with cooldown/resource rules.
- Downed/revive state.
- Run completion and failure.
- Deterministic dungeon generation from a server-selected seed.

## 1.2 Non-goals

The MVP SHALL NOT require:

- PvP.
- Persistent player progression.
- Large-scale matchmaking.
- Trading.
- Complex account/economy systems.
- Mobile input.
- Full content parity with any existing commercial game.

---

# 2. Client Architecture

```text
Phaser Game
├── BootScene
├── LobbyScene
├── DungeonScene
│   ├── PlayerRenderer
│   ├── EnemyRenderer
│   ├── ProjectileRenderer
│   ├── LootRenderer
│   └── Effects/UI
├── HUD
└── NetworkClient
```

Recommended client modules:

```text
src/
├── game/
│   ├── scenes/
│   ├── entities/
│   ├── systems/
│   └── input/
├── network/
│   ├── WebSocketClient
│   ├── MessageCodec
│   └── SnapshotBuffer
├── gameplay/
│   ├── weapons/
│   ├── abilities/
│   └── prediction/
└── data/
```

The client SHALL treat the server as authoritative for game state.

---

# 3. Input and Core Interaction System

## 3.1 Input model

The client SHALL convert local keyboard/mouse state into discrete input commands.

Example:

```typescript
interface PlayerInput {
  sequence: number;
  clientTick: number;
  moveX: number;      // -1..1
  moveY: number;      // -1..1
  aimX: number;
  aimY: number;
  fire: boolean;
  ability: boolean;
  interact: boolean;
}
```

Suggested controls:

| Input | Action |
|---|---|
| W/A/S/D | Movement |
| Mouse | Aim |
| Left click | Fire |
| Right click | Ability |
| E | Interact/revive |

The client SHALL normalize movement vectors to prevent faster diagonal movement.

## 3.2 Simulation

Use a fixed server simulation tick, initially **20–30 Hz**.

The client may render at the browser's animation rate independently.

```text
Client render:      ~60 FPS
Server simulation:  20–30 ticks/sec
Network snapshots:  configurable
```

The server SHALL own:

- Position validation.
- Collision results.
- Fire-rate validation.
- Damage.
- HP.
- Enemy AI.
- Projectile authority.
- Loot state.
- Ability cooldowns.
- Room progression.

---

# 4. Dungeon Generation

## 4.1 Generation strategy

Use a **graph-first + room-template** approach for the MVP.

Pipeline:

```text
Seed
 ↓
Generate logical room graph
 ↓
Validate graph connectivity
 ↓
Assign room types
 ↓
Select room templates
 ↓
Place doors/connections
 ↓
Validate spatial constraints
 ↓
Spawn encounter/loot data
```

## 4.2 Logical graph

Represent a dungeon as:

```csharp
public enum RoomType
{
    Start,
    Combat,
    Reward,
    Shop,
    Boss
}

public sealed class DungeonRoom
{
    public int Id { get; init; }
    public RoomType Type { get; set; }
    public List<int> Neighbors { get; } = [];
}
```

MVP constraints:

- Exactly one Start room.
- Exactly one Boss room.
- At least 3 Combat rooms.
- At least 1 Reward room.
- Optional Shop room.
- Boss MUST be reachable from Start.
- No disconnected required rooms.
- Maximum room count SHOULD remain small enough for short runs.

## 4.3 Graph generation

Recommended initial algorithm:

1. Create a Start node.
2. Randomly extend a path until the minimum number of rooms is reached.
3. Attach optional branches.
4. Mark the final progression node as Boss.
5. Assign remaining nodes as Combat/Reward/Shop.
6. Run BFS/DFS from Start.
7. Reject/regenerate if the Boss or required room is unreachable.

A deterministic PRNG SHALL be initialized from the server-generated seed.

```text
seed
 ↓
PRNG
 ├── room graph
 ├── room template choices
 ├── enemy groups
 └── loot rolls
```

The same seed + generation version SHALL produce the same dungeon definition.

## 4.4 Room templates

A room template SHOULD define:

```csharp
public sealed class RoomTemplate
{
    public string Id { get; init; } = "";
    public int Width { get; init; }
    public int Height { get; init; }
    public List<SpawnPoint> EnemySpawns { get; init; } = [];
    public List<SpawnPoint> LootSpawns { get; init; } = [];
    public List<DoorPoint> Doors { get; init; } = [];
}
```

Templates should be authored manually and selected procedurally.

This reduces the risk of generating impossible combat spaces.

---

# 5. Gameplay State Model

```csharp
public sealed class GameState
{
    public Guid RoomId { get; init; }
    public int Tick { get; set; }
    public int Seed { get; init; }

    public DungeonState Dungeon { get; init; }
    public Dictionary<Guid, PlayerState> Players { get; init; }
    public Dictionary<Guid, EnemyState> Enemies { get; init; }
    public Dictionary<Guid, ProjectileState> Projectiles { get; init; }
    public Dictionary<Guid, ItemState> Items { get; init; }
}
```

The server SHALL maintain a single authoritative state per game room.

---

# 6. Weapon System

## 6.1 Weapon schema

A weapon definition SHOULD be data-driven.

```csharp
public sealed class WeaponDefinition
{
    public string Id { get; init; } = "";
    public string Name { get; init; } = "";
    public WeaponType Type { get; init; }

    public float Damage { get; init; }
    public float FireInterval { get; init; }
    public float ProjectileSpeed { get; init; }
    public int ProjectileCount { get; init; }
    public float SpreadDegrees { get; init; }
    public int EnergyCost { get; init; }
}
```

Initial definitions:

```text
pistol
shotgun
sword
```

## 6.2 Inventory schema

```csharp
public sealed class PlayerInventory
{
    public List<InventorySlot> Slots { get; init; } = [];
    public int ActiveSlot { get; set; }
}

public sealed class InventorySlot
{
    public string? WeaponId { get; set; }
    public int? InstanceId { get; set; }
}
```

MVP recommendation: **2 weapon slots per player**.

A weapon pickup SHALL be processed by the server:

```text
PICKUP_REQUEST
      ↓
Validate distance
      ↓
Validate item exists
      ↓
Validate item is available
      ↓
Replace/add inventory item
      ↓
Broadcast inventory update
```

The client SHALL NOT be trusted to decide whether a pickup succeeded.

---

# 7. Character Architecture

Use composition for abilities rather than a deep inheritance tree.

```text
CharacterDefinition
├── BaseStats
├── StarterWeapon
├── AbilityDefinition
└── PassiveDefinition (future)
```

Example:

```csharp
public sealed class CharacterDefinition
{
    public string Id { get; init; } = "";
    public float MaxHp { get; init; }
    public float MoveSpeed { get; init; }
    public int MaxEnergy { get; init; }
    public string StarterWeaponId { get; init; } = "";
    public AbilityDefinition Ability { get; init; } = default!;
}
```

Initial characters:

```text
Guardian
 └── Shield

Rogue
 └── Dash

Mage
 └── Arcane Burst
```

## 7.1 Ability framework

```csharp
public interface IAbility
{
    bool CanActivate(PlayerState player, GameState state);
    void Activate(PlayerState player, GameState state);
    void Update(PlayerState player, GameState state, float deltaTime);
}
```

All ability activation SHALL be validated server-side.

The server SHALL own:

- cooldown start/end;
- resource consumption;
- target validation;
- damage/effects;
- resulting state.

---

# 8. Enemy Architecture

Use a shared enemy base with composition for movement/attack behavior.

```text
EnemyEntity
├── EnemyDefinition
├── HealthComponent
├── MovementComponent
├── TargetingComponent
├── AttackComponent
└── AIController
```

Example:

```csharp
public abstract class EnemyAI
{
    public abstract void Tick(
        EnemyState enemy,
        GameState state,
        float deltaTime);
}
```

Initial AI implementations:

```text
ChaserAI
 └── Move toward target + contact attack

ShooterAI
 └── Maintain preferred range + projectile attack

BruteAI
 └── Slow chase + heavy melee attack

DungeonWardenAI
 ├── ProjectileAttack
 ├── AreaAttack
 ├── SummonAttack
 └── PhaseController
```

## 8.1 Enemy state machine

```text
Idle
 ↓
AcquireTarget
 ↓
Chase ───────→ Attack
 ↑               │
 └───────────────┘
 ↓
Dead
```

The server SHALL execute enemy AI.

Clients receive resulting enemy snapshots/events.

---

# 9. Collision and Combat

The server SHALL be authoritative for all meaningful combat outcomes.

## 9.1 Projectile flow

```text
Client
  │ FIRE input
  ↓
Server
  │ validate weapon/cooldown
  ↓
Create projectile
  ↓
Simulate projectile
  ↓
Collision detection
  ↓
Apply damage
  ↓
Emit combat event
  ↓
Clients render result
```

## 9.2 Damage event

```csharp
public sealed class DamageEvent
{
    public Guid SourceId { get; init; }
    public Guid TargetId { get; init; }
    public float Amount { get; init; }
    public DamageType Type { get; init; }
}
```

Clients may predict visual feedback, but the authoritative HP value SHALL originate from the server.

---

# 10. Co-op State and Revive System

Player states:

```text
Alive
  ↓ HP <= 0
Downed
  ↓ revive
Alive

Downed
  ↓ timeout
Eliminated
```

Example:

```csharp
public enum PlayerLifeState
{
    Alive,
    Downed,
    Eliminated
}
```

A revive request SHALL contain:

```csharp
public sealed class ReviveRequest
{
    public Guid TargetPlayerId { get; init; }
}
```

Server validation:

1. Requesting player is alive.
2. Target player is downed.
3. Players are within revive range.
4. Revive interaction is allowed.
5. Revive timer completes without interruption.

---

# 11. Network Architecture

## 11.1 Topology

```text
                ┌───────────────────┐
                │ .NET Game Server  │
                │                   │
                │ Authoritative     │
                │ Game Simulation   │
                └─────────┬─────────┘
                          │
             WebSocket / TLS
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
       Client A        Client B        Client C
```

The MVP uses a dedicated server model.

## 11.2 Message categories

### Client → Server

```text
JOIN_ROOM
PLAYER_INPUT
PICKUP_REQUEST
REVIVE_REQUEST
USE_ABILITY
LEAVE_ROOM
```

### Server → Client

```text
ROOM_JOINED
GAME_START
WORLD_SNAPSHOT
ENTITY_SPAWN
ENTITY_DESPAWN
DAMAGE_EVENT
WEAPON_PICKUP
INVENTORY_UPDATE
ABILITY_RESULT
PLAYER_DOWNED
PLAYER_REVIVED
ROOM_COMPLETE
GAME_OVER
```

---

# 12. Synchronization Model

Use a hybrid model:

```text
Client → Server:
    input commands

Server:
    authoritative simulation

Server → Client:
    snapshots + important events
```

## 12.1 Sequence numbers

Each input SHALL include a monotonically increasing sequence number.

```text
Input #100
Input #101
Input #102
```

Server snapshots SHOULD include the latest processed input sequence for that player.

```csharp
public sealed class WorldSnapshot
{
    public int ServerTick { get; init; }
    public int LastProcessedInput { get; init; }
    public List<EntitySnapshot> Entities { get; init; } = [];
}
```

This provides the foundation for client-side reconciliation.

## 12.2 Player movement

Recommended future-ready model:

```text
Local input
   ↓
Client prediction
   ↓
Render immediately
   ↓
Send input
   ↓
Server simulation
   ↓
Authoritative snapshot
   ↓
Reconcile local player
```

Remote players SHOULD be rendered using interpolation between buffered server snapshots.

## 12.3 Important events

Events such as these SHOULD be reliable at the application level:

- Weapon pickup.
- Player downed.
- Player revived.
- Boss phase change.
- Room completed.
- Game victory/defeat.

High-frequency movement state can be snapshot-based.

---

# 13. Room Lifecycle

```text
WaitingForPlayers
      ↓
Starting
      ↓
Exploring
      ↓
Combat
      ↓
RoomCleared
      ↓
NextRoom
      ↓
BossCombat
      ↓
Victory / Defeat
```

The server SHALL control transitions.

A combat room SHOULD become active when the required player-entry condition is satisfied.

The room SHOULD become cleared only after all required enemies are defeated.

---

# 14. Persistence

Persistence is intentionally minimal for MVP.

Required persistent data, if accounts are implemented:

```text
Player
Character unlock/status (optional)
Basic profile
```

Run-specific state SHOULD remain in memory on the game server.

Do not persist every movement or combat tick.

Future persistent entities:

```text
Player
Character
WeaponCollection
RunHistory
Statistics
Cosmetics
```

---

# 15. Security and Trust Boundaries

The browser is an **untrusted client**.

The server SHALL NOT accept client claims such as:

```text
"My HP is 100."
"The enemy died."
"I picked up this weapon."
"I teleported to x=999."
"My weapon fired 50 times per second."
```

Instead, the client sends intent:

```text
MOVE
FIRE
USE_ABILITY
PICKUP
REVIVE
```

The server validates the request against authoritative state.

---

# 16. Observability Requirements

For a networking-focused project, expose at least:

- Connected players.
- Active game rooms.
- Server tick duration.
- WebSocket connections.
- Messages/sec.
- Snapshot size.
- Input latency.
- Simulation errors.
- Room completion/failure counts.

Future monitoring:

```text
.NET Game Server
      │
      ↓
Prometheus metrics
      │
      ↓
Grafana
```

This also provides a natural bridge to production-style DevOps work.

---

# 17. Development Milestones

## M1 — Offline prototype

- Phaser scene.
- Player movement.
- Mouse aiming.
- Three weapons.
- Basic enemy.
- Collision.
- One room.

## M2 — Multiplayer connection

- ASP.NET Core server.
- WebSocket connection.
- Room creation/join.
- Player spawn.
- Input messages.

## M3 — Authoritative simulation

- Server movement.
- Server collision.
- Server combat.
- World snapshots.
- Multiple players.

## M4 — Dungeon

- Room graph.
- Templates.
- Seeded generation.
- Combat/reward/boss rooms.
- Room lifecycle.

## M5 — Gameplay

- Weapon pickups.
- Inventory.
- Character abilities.
- Enemy AI.
- Boss.
- Downed/revive.

## M6 — Network quality

- Client prediction.
- Reconciliation.
- Remote-player interpolation.
- Sequence numbers.
- Latency simulation.
- Packet/message loss testing.

## M7 — Deployment

- Docker images.
- Linux deployment.
- CI/CD.
- Metrics.
- Prometheus/Grafana.
- Basic load testing.

---

# 18. MVP Acceptance Tests

The development team SHOULD be able to demonstrate:

### Gameplay

- [ ] Player can move and aim.
- [ ] Player can fire all three weapons.
- [ ] Weapons have distinguishable behavior.
- [ ] Enemies can damage players.
- [ ] Players can damage enemies.
- [ ] Character abilities work.
- [ ] Weapons can be picked up and equipped.
- [ ] Players can become downed and be revived.
- [ ] Boss can be defeated.

### Dungeon

- [ ] Dungeon is generated from a seed.
- [ ] Start and Boss rooms are reachable.
- [ ] Required rooms are connected.
- [ ] Combat rooms have valid spawn points.
- [ ] Different seeds produce different valid layouts.

### Multiplayer

- [ ] Four players can join one room.
- [ ] Players see each other's movement.
- [ ] Combat results converge to server state.
- [ ] Weapon pickups are synchronized.
- [ ] Enemy state is synchronized.
- [ ] Revive state is synchronized.
- [ ] A player cannot arbitrarily modify authoritative state.

### Networking

- [ ] Input sequence numbers are tracked.
- [ ] Server ticks independently of rendering FPS.
- [ ] Snapshots contain server tick information.
- [ ] Local prediction/reconciliation is testable.
- [ ] Remote interpolation is testable.
- [ ] Artificial latency can be introduced for testing.
