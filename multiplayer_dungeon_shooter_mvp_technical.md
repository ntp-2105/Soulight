# Multiplayer Dungeon Shooter --- MVP Technical Specification

## Technical Developer Version

**Working concept:** Downloadable, cross-platform 1–4 player
cooperative top-down action roguelite. The game client targets PC and
mobile; the website is a landing page and download portal.

**Target stack**

- Game client: Godot 4 + GDScript.
- Initial client targets: Windows PC and Android; keep iOS as a later platform subject to export and device testing.
- Game server: C# + .NET / ASP.NET Core.
- Primary real-time transport: WebSocket over TLS.
- Persistence: Firebase. Use Firebase Authentication only if accounts are included; choose Cloud Firestore or Realtime Database for selected persistent player data.
- Website: separate landing page and download portal; it does not host the playable game.
- Deployment target: containerized Linux game server.

------------------------------------------------------------------------

# 1. MVP Scope

## 1.1 Functional requirements

The MVP SHALL support:

-   1–4 players per game room.
-   PC keyboard/mouse controls and mobile touch controls.
-   Real-time movement and aiming.
-   Server-authoritative combat.
-   Three character archetypes.
-   Three weapons.
-   Three enemy archetypes.
-   One boss.
-   Procedurally assembled dungeon.
-   Weapon pickup/equip/drop flow.
-   Character abilities with cooldown/resource rules.
-   Downed/revive state.
-   Run completion and failure.
-   Deterministic dungeon generation from a server-selected seed.

## 1.2 Initial platform and delivery assumptions

-   First release target: Windows PC and Android.
-   iOS is a later target unless the team explicitly commits to Apple
    provisioning, export setup, and device testing during the MVP.
-   The game is installed and launched as an application; the website
    provides product information and links to signed/released build
    artifacts.
-   PC and mobile clients connect to the same backend protocol and may
    join the same room, subject to cross-platform testing.
-   The website is a separate deployment from the game client and game
    server.

## 1.3 Non-goals

The MVP SHALL NOT require:

-   PvP.
-   Persistent player progression.
-   Large-scale matchmaking.
-   Trading.
-   Complex account/economy systems.
-   Full parity across every possible device and operating system in the
    first release.
-   Full content parity with any existing commercial game.

------------------------------------------------------------------------

# 2. Client Architecture

## 2.1 Godot project structure

Use Godot 4 with GDScript for the game client. Keep gameplay rules,
presentation, input mapping, and networking separated so PC and mobile
can share the same game logic.

``` text
res://
├── scenes/
│   ├── boot/
│   ├── menus/
│   ├── lobby/
│   ├── dungeon/
│   ├── entities/
│   └── ui/
├── scripts/
│   ├── gameplay/
│   │   ├── weapons/
│   │   ├── abilities/
│   │   ├── enemies/
│   │   └── dungeon/
│   ├── input/
│   ├── networking/
│   ├── data/
│   └── utilities/
├── resources/
│   ├── characters/
│   ├── weapons/
│   ├── enemies/
│   └── rooms/
├── assets/
└── project.godot
```

Suggested scenes include `Boot`, `MainMenu`, `Lobby`, `Dungeon`,
`Player`, `Enemy`, `Projectile`, `Loot`, and reusable HUD components.
Use Godot scenes and resources for reusable entities and data-driven
definitions.

## 2.2 Client responsibilities

The client SHALL handle:

-   Rendering, animation, sound, effects, and HUD.
-   Reading input from the active platform.
-   Sending player intent to the server.
-   Displaying authoritative state and game events.
-   Optional local movement prediction and remote-entity interpolation.
-   Local preferences such as audio, display, and control settings.

The client SHALL NOT be authoritative for damage, health, enemy deaths,
loot ownership, cooldown validation, or room progression.

## 2.3 Platform abstraction

Gameplay code SHALL consume a shared input model rather than directly
depending on keyboard, mouse, or touch controls. Implement separate
input adapters for desktop and mobile that produce the same normalized
gameplay commands.

PC input uses keyboard and mouse. Mobile input uses a virtual movement
joystick plus touch controls for aiming, firing, abilities, and
interactions. Control layout and HUD scale must be adjustable for common
aspect ratios.

## 2.4 Godot networking

Use Godot's networking APIs, such as `WebSocketPeer`, to connect to the
ASP.NET Core server over `wss://`. Keep transport and message parsing
behind a `NetworkClient` abstraction so message handling does not become
coupled to individual scenes.

The client should handle connection states, reconnect attempts,
protocol/version mismatch, timeout, and graceful return to the main
menu. Verify WebSocket behavior on every intended export target early in
development.

------------------------------------------------------------------------

# 3. Input and Core Interaction System

## 3.1 Shared input model

The client SHALL convert desktop or touch input into the same logical
command model. Example GDScript data object:

``` gdscript
class_name PlayerInput
extends RefCounted

var sequence: int = 0
var client_tick: int = 0
var move: Vector2 = Vector2.ZERO
var aim_direction: Vector2 = Vector2.RIGHT
var fire: bool = false
var ability: bool = false
var interact: bool = false
```

Serialize the model into a versioned network message. The server
validates and interprets the intent; it does not trust client-supplied
positions, damage, cooldowns, or outcomes.

## 3.2 Suggested controls

  -----------------------------------------------------------------------
  Action                  PC                      Mobile
  ----------------------- ----------------------- -----------------------
  Movement                WASD or arrow keys      Virtual joystick

  Aim                     Mouse position          Right-side aim control
                                                  / aim stick

  Fire                    Left mouse button       Fire button or
                                                  configured aim-and-fire
                                                  control

  Ability                 Right mouse button or   Ability button
                          mapped key              

  Interact/revive         E or mapped key         Interact/revive button

  Pause/menu              Escape                  On-screen pause button
  -----------------------------------------------------------------------

Control bindings should be configurable where practical. Mobile controls
must avoid obscuring important combat areas and should be tested in
landscape orientation first.

## 3.3 Simulation and rendering

Use a fixed server simulation tick, initially **20–30 Hz**. Godot
renders locally at the device's supported frame rate independently.

``` text
Client rendering:   target 60 FPS where hardware allows
Server simulation:  20–30 ticks/sec initially
Network snapshots:  configurable and measured
```

The server SHALL own:

-   Position and movement validation.
-   Collision outcomes that affect gameplay.
-   Fire-rate and ability validation.
-   Damage and HP.
-   Enemy AI and projectile authority.
-   Loot state and inventory changes.
-   Room progression and victory/defeat.

Client-side prediction is optional and should be added only after basic
authoritative multiplayer works.

------------------------------------------------------------------------

# 4. Dungeon Generation

## 4.1 Generation strategy

Use a **graph-first + room-template** approach for the MVP.

Pipeline:

``` text
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

``` csharp
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

-   Exactly one Start room.
-   Exactly one Boss room.
-   At least 3 Combat rooms.
-   At least 1 Reward room.
-   Optional Shop room.
-   Boss MUST be reachable from Start.
-   No disconnected required rooms.
-   Maximum room count SHOULD remain small enough for short runs.

## 4.3 Graph generation

Recommended initial algorithm:

1.  Create a Start node.
2.  Randomly extend a path until the minimum number of rooms is reached.
3.  Attach optional branches.
4.  Mark the final progression node as Boss.
5.  Assign remaining nodes as Combat/Reward/Shop.
6.  Run BFS/DFS from Start.
7.  Reject/regenerate if the Boss or required room is unreachable.

A deterministic PRNG SHALL be initialized from the server-generated
seed.

``` text
seed
 ↓
PRNG
 ├── room graph
 ├── room template choices
 ├── enemy groups
 └── loot rolls
```

The same seed + generation version SHALL produce the same dungeon
definition.

## 4.4 Room templates

A room template SHOULD define:

``` csharp
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

------------------------------------------------------------------------

# 5. Gameplay State Model

``` csharp
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

------------------------------------------------------------------------

# 6. Weapon System

## 6.1 Weapon schema

A weapon definition SHOULD be data-driven.

``` csharp
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

``` text
pistol
shotgun
sword
```

## 6.2 Inventory schema

``` csharp
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

``` text
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

------------------------------------------------------------------------

# 7. Character Architecture

Use composition for abilities rather than a deep inheritance tree.

``` text
CharacterDefinition
├── BaseStats
├── StarterWeapon
├── AbilityDefinition
└── PassiveDefinition (future)
```

Example:

``` csharp
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

``` text
Guardian
 └── Shield

Rogue
 └── Dash

Mage
 └── Arcane Burst
```

## 7.1 Ability framework

``` csharp
public interface IAbility
{
    bool CanActivate(PlayerState player, GameState state);
    void Activate(PlayerState player, GameState state);
    void Update(PlayerState player, GameState state, float deltaTime);
}
```

All ability activation SHALL be validated server-side.

The server SHALL own:

-   cooldown start/end;
-   resource consumption;
-   target validation;
-   damage/effects;
-   resulting state.

------------------------------------------------------------------------

# 8. Enemy Architecture

Use a shared enemy base with composition for movement/attack behavior.

``` text
EnemyEntity
├── EnemyDefinition
├── HealthComponent
├── MovementComponent
├── TargetingComponent
├── AttackComponent
└── AIController
```

Example:

``` csharp
public abstract class EnemyAI
{
    public abstract void Tick(
        EnemyState enemy,
        GameState state,
        float deltaTime);
}
```

Initial AI implementations:

``` text
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

``` text
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

------------------------------------------------------------------------

# 9. Collision and Combat

The server SHALL be authoritative for all meaningful combat outcomes.

## 9.1 Projectile flow

``` text
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

``` csharp
public sealed class DamageEvent
{
    public Guid SourceId { get; init; }
    public Guid TargetId { get; init; }
    public float Amount { get; init; }
    public DamageType Type { get; init; }
}
```

Clients may predict visual feedback, but the authoritative HP value
SHALL originate from the server.

------------------------------------------------------------------------

# 10. Co-op State and Revive System

Player states:

``` text
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

``` csharp
public enum PlayerLifeState
{
    Alive,
    Downed,
    Eliminated
}
```

A revive request SHALL contain:

``` csharp
public sealed class ReviveRequest
{
    public Guid TargetPlayerId { get; init; }
}
```

Server validation:

1.  Requesting player is alive.
2.  Target player is downed.
3.  Players are within revive range.
4.  Revive interaction is allowed.
5.  Revive timer completes without interruption.

------------------------------------------------------------------------

# 11. Network Architecture

## 11.1 Topology

``` text
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

``` text
JOIN_ROOM
PLAYER_INPUT
PICKUP_REQUEST
REVIVE_REQUEST
USE_ABILITY
LEAVE_ROOM
```

### Server → Client

``` text
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

------------------------------------------------------------------------

# 12. Synchronization Model

Use a hybrid model:

``` text
Client → Server:
    input commands

Server:
    authoritative simulation

Server → Client:
    snapshots + important events
```

## 12.1 Sequence numbers

Each input SHALL include a monotonically increasing sequence number.

``` text
Input #100
Input #101
Input #102
```

Server snapshots SHOULD include the latest processed input sequence for
that player.

``` csharp
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

``` text
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

Remote players SHOULD be rendered using interpolation between buffered
server snapshots.

## 12.3 Important events

Events such as these SHOULD be reliable at the application level:

-   Weapon pickup.
-   Player downed.
-   Player revived.
-   Boss phase change.
-   Room completed.
-   Game victory/defeat.

High-frequency movement state can be snapshot-based.

------------------------------------------------------------------------

# 13. Room Lifecycle

``` text
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

A combat room SHOULD become active when the required player-entry
condition is satisfied.

The room SHOULD become cleared only after all required enemies are
defeated.

------------------------------------------------------------------------

# 14. Persistence

Firebase is the MVP persistence platform for selected long-lived player
data. It is **not** the real-time multiplayer simulation engine.

## 14.1 Suggested scope

Depending on whether accounts are in the MVP, persist only what is
needed:

-   Player profile and display name.
-   Basic settings or account-linked preferences, if required.
-   Unlocked characters or other persistent unlocks, if progression is
    included.
-   Run history or statistics only if they are an explicit MVP
    requirement.

Run-specific state---including player positions, active projectiles,
enemy AI state, current room state, temporary inventory, and combat
events---SHALL remain in the authoritative game server's memory. Do not
write every movement or combat tick to Firebase.

## 14.2 Firebase integration

-   Choose **Firebase Authentication** only if the MVP requires player
    accounts.
-   Choose **Cloud Firestore** or **Realtime Database** for the small
    set of persistent records; select one based on the access patterns
    rather than using both by default.
-   The ASP.NET Core server should perform privileged writes through the
    appropriate Firebase server-side SDK or authenticated server
    integration.
-   Never embed service-account credentials in the Godot client or ship
    privileged Firebase secrets in a downloadable build.
-   Apply security rules and server-side authorization so clients cannot
    grant themselves unlocks or modify trusted statistics.
-   Keep the Firebase project configuration separate for development and
    production.

## 14.3 Future persistent entities

``` text
PlayerProfile
CharacterUnlocks
RunHistory (optional)
Statistics (optional)
Cosmetics (future)
```

Avoid adding a complex progression or economy system until the core
co-op run is fun and stable.

------------------------------------------------------------------------

# 15. Security and Trust Boundaries

The game client is an **untrusted client**, regardless of whether it
runs on PC or mobile.

The server SHALL NOT accept client claims such as:

``` text
"My HP is 100."
"The enemy died."
"I picked up this weapon."
"I teleported to x=999."
"My weapon fired 50 times per second."
```

Instead, the client sends intent:

``` text
MOVE
FIRE
USE_ABILITY
PICKUP
REVIVE
```

The server validates the request against authoritative state.

------------------------------------------------------------------------

# 16. Website and Release Distribution

The website is a download portal, not a browser-hosted game.

Website MVP content: - Game description and core features. - Screenshots
and short gameplay clips. - Supported platforms and minimum
requirements. - Download links for the current approved build. - Version
number, release notes, and known issues. - Support/contact and privacy
information as applicable.

Distribution: - Windows: publish a versioned installer or portable
package for early testing; consider code signing before public
distribution. - Android: distribute test APKs to a controlled group
first; use Google Play when ready for a store release. - iOS, if added:
plan for Apple signing, provisioning, and App Store/TestFlight
distribution. - The website should link to release artifacts hosted by
the chosen release provider or store. Do not hard-code temporary
development URLs.

The website must clearly identify the current version and supported
platforms. Build and publish steps should be repeatable through CI/CD
where feasible.

------------------------------------------------------------------------

# 17. Observability Requirements

For a networking-focused project, expose at least:

-   Connected players.
-   Active game rooms.
-   Server tick duration.
-   WebSocket connections.
-   Messages/sec.
-   Snapshot size.
-   Input latency.
-   Simulation errors.
-   Room completion/failure counts.

Future monitoring:

``` text
.NET Game Server
      │
      ↓
Prometheus metrics
      │
      ↓
Grafana
```

This also provides a natural bridge to production-style DevOps work.

------------------------------------------------------------------------

# 18. Development Milestones

## M1 --- Godot offline prototype

-   Create the Godot project and core scene structure.
-   Implement movement, aiming, and collision.
-   Add one weapon, one enemy, one room, and basic HUD.
-   Validate keyboard/mouse input and a mobile touch-control proof of
    concept.
-   Export and run a basic Windows build.

## M2 --- Core gameplay

-   Add all three initial weapons.
-   Add the three character archetypes and abilities.
-   Add enemy behaviors and basic loot.
-   Implement room transitions and a simple boss encounter.
-   Add seeded dungeon generation using room templates.

## M3 --- Multiplayer connection

-   Implement the ASP.NET Core server and WebSocket protocol.
-   Implement room creation/joining, player spawn, and disconnect
    handling.
-   Connect the Godot `NetworkClient` and send input commands.
-   Add protocol versioning and connection/error UI.

## M4 --- Authoritative simulation

-   Implement server-owned movement validation, collisions, combat,
    enemy AI, and loot.
-   Broadcast world snapshots and important events.
-   Synchronize multiple players and room progression.
-   Ensure clients cannot decide combat outcomes.

## M5 --- Co-op completion

-   Add weapon pickup and inventory synchronization.
-   Implement downed/revive behavior.
-   Complete boss, victory, defeat, and restart flow.
-   Verify a complete four-player run.

## M6 --- Cross-platform input and packaging

-   Finish desktop input mapping and settings.
-   Implement mobile joystick, aim/fire, ability, and interaction
    controls.
-   Export Android builds and test on physical devices.
-   Test reconnect behavior after app suspension and network changes.
-   Validate that PC and Android clients can join the same session.
-   Evaluate iOS export only if it is within the committed MVP scope.

## M7 --- Firebase persistence and website

-   Add Firebase Authentication only if accounts are required.
-   Persist only agreed player profile/progression data.
-   Verify server-side authorization and Firebase security rules.
-   Publish the landing/download website and versioned release links.

## M8 --- Quality and deployment

-   Add latency simulation and multiplayer integration tests.
-   Measure server tick duration, message rate, and snapshot size.
-   Containerize and deploy the .NET server to Linux.
-   Add CI/CD for server tests/deployment and repeatable client
    build/release steps.
-   Add basic metrics and load testing.

------------------------------------------------------------------------

# 19. MVP Acceptance Tests

The development team SHOULD be able to demonstrate:

### Gameplay

-   [ ] Player can move and aim.
-   [ ] Player can fire all three weapons.
-   [ ] Weapons have distinguishable behavior.
-   [ ] Enemies can damage players.
-   [ ] Players can damage enemies.
-   [ ] Character abilities work.
-   [ ] Weapons can be picked up and equipped.
-   [ ] Players can become downed and be revived.
-   [ ] Boss can be defeated.

### Dungeon

-   [ ] Dungeon is generated from a seed.
-   [ ] Start and Boss rooms are reachable.
-   [ ] Required rooms are connected.
-   [ ] Combat rooms have valid spawn points.
-   [ ] Different seeds produce different valid layouts.

### Multiplayer

-   [ ] Four players can join one room.
-   [ ] Players see each other's movement.
-   [ ] Combat results converge to server state.
-   [ ] Weapon pickups are synchronized.
-   [ ] Enemy state is synchronized.
-   [ ] Revive state is synchronized.
-   [ ] A player cannot arbitrarily modify authoritative state.

### Networking

-   [ ] Input sequence numbers are tracked.
-   [ ] Server ticks independently of rendering FPS.
-   [ ] Snapshots contain server tick information.
-   [ ] Local prediction/reconciliation is testable.
-   [ ] Remote interpolation is testable.
-   [ ] Artificial latency can be introduced for testing.

### Platform and release

-   [ ] Windows build launches without a browser.
-   [ ] Game assets and configuration load from the packaged
    application.
-   [ ] Desktop keyboard/mouse controls work.
-   [ ] Android build installs and launches on a supported physical
    device.
-   [ ] Touch controls support movement, aiming/firing, ability, and
    interaction.
-   [ ] PC and Android clients can connect to the same multiplayer room.
-   [ ] A suspended or disconnected mobile client receives a clear
    recovery path.
-   [ ] Website download links point to the intended versioned release.
-   [ ] Firebase credentials with privileged access are not shipped in
    the client.
