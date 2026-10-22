# Multiplayer Dungeon Shooter --- MVP Plan

## Non-Technical Stakeholder Version

**Working concept:** A downloadable PC and mobile cooperative top-down
action roguelite inspired by the fast, room-based feel of *Soul Knight*.
The game runs as an application; the website introduces the game and
provides download links. The MVP focuses on a polished, replayable
dungeon run for small co-op teams rather than the breadth of a full
commercial game.

## 1. Product Vision

Players enter a dangerous procedurally generated dungeon, fight enemies,
discover and equip weapons, use character abilities, cooperate with
teammates, and defeat a boss. Each run should feel easy to understand
within minutes while creating enough variation that repeating a run does
not feel identical.

### Target MVP experience

-   Downloadable Windows PC and Android builds for the initial release.
-   A separate official website with game information and download
    links.
-   1–4 players in a cooperative room.
-   Short dungeon run with several combat rooms and one boss encounter.
-   Three playable characters.
-   Three initial weapons.
-   Three enemy archetypes plus one boss.
-   Randomized room layouts and reward placement.
-   Simple revive/downed-player system.
-   Clear victory and defeat states.

## 2. Core Gameplay Loop

The intended experience is:

**Join → Explore → Fight → Collect → Upgrade your options → Cooperate →
Defeat the boss → Start another run**

### What the player does

Players install and launch the game on PC or mobile, then move freely
around a top-down room, aim independently, attack enemies, dodge
threats, collect rewards, and activate a character-specific skill. PC
uses keyboard and mouse; mobile uses on-screen touch controls.

The controls should feel immediate and responsive. Movement and aiming
should be understandable without a tutorial-heavy experience. Weapons
should have visibly different behavior: for example, a fast pistol, a
spread-based shotgun, and a close-range sword.

### The desired feel

The MVP should emphasize:

-   **Responsive:** movement and shooting react immediately.
-   **Readable:** enemy attacks and dangerous areas are visually
    obvious.
-   **Fast:** encounters are short enough to maintain momentum.
-   **Rewarding:** opening a chest or defeating a difficult enemy should
    create anticipation.
-   **Cooperative:** players benefit from helping one another instead of
    simply fighting independently.

## 3. Dungeon Structure

A run is divided into connected rooms rather than one enormous
continuous map.

Example:

``` text
Start
  |
Combat ── Combat
  |          |
Reward      Shop/Reward
  |
Combat ── Boss
```

The exact layout changes between runs.

### Procedural-generation logic

At the beginning of a run, the game creates a new dungeon using a random
seed. The seed acts as the recipe for that run's layout.

Generation should guarantee several rules:

1.  There is exactly one reachable starting room.
2.  There is a reachable boss room.
3.  Every required progression room can be reached.
4.  Combat rooms contain enough space for movement.
5.  Reward rooms do not make the main path impossible.
6.  The generated dungeon is different across runs while remaining
    playable.

The MVP does **not** need unlimited procedural complexity. A small
library of handcrafted room templates can be combined and randomized to
produce many valid runs.

## 4. Initial Weapon Collection and Progression

The first weapon system should be intentionally small.

### Starting equipment

Each character begins with one starter weapon.

### Finding new weapons

During a run, players can obtain weapons from:

-   Enemy drops.
-   Reward rooms.
-   Treasure chests.
-   The end of selected combat encounters.

For the MVP, a player can carry a small number of weapons, such as two
active weapon slots. Picking up a new weapon requires replacing an
existing one if both slots are occupied.

### Initial weapon set

**Pistol** - Reliable all-purpose weapon. - Fast firing. - Low damage
per shot.

**Shotgun** - Fires multiple pellets. - High close-range damage. - Lower
effective range.

**Sword** - Melee attack. - No projectile travel. - Useful when enemies
get close.

The first goal is not to provide hundreds of items. It is to prove that
discovering, comparing, equipping, and using different weapons is fun.

## 5. Initial Character Roster

The MVP starts with three intentionally distinct roles.

### Guardian --- defensive

-   Balanced health and movement.
-   Skill: **Shield** --- temporarily reduces or blocks incoming damage.
-   Intended role: protect teammates and survive dangerous encounters.

### Rogue --- mobility

-   Lower durability but faster movement.
-   Skill: **Dash** --- rapidly moves through a short distance and
    briefly avoids danger.
-   Intended role: reposition quickly and evade attacks.

### Mage --- area damage

-   Lower durability.
-   Skill: **Arcane Burst** --- releases an area attack around a target
    location.
-   Intended role: control groups of enemies.

These are original MVP archetypes rather than copies of existing
characters.

## 6. Initial Enemy Roster

### Chaser

-   Moves directly toward players.
-   Deals contact damage.
-   Encourages movement and kiting.

### Shooter

-   Keeps some distance.
-   Fires projectiles toward players.
-   Encourages positioning and target prioritization.

### Brute

-   Slow movement.
-   High health.
-   Strong close-range attack.
-   Encourages coordinated focus fire.

### Boss: Dungeon Warden

The first boss combines the basic enemy behaviors:

-   Periodic projectile attacks.
-   Short-range area attack.
-   Summons smaller enemies.
-   Clear attack warnings.
-   Multiple phases based on health.

The boss should be challenging because players need to read its patterns
and cooperate, not because it simply has an enormous amount of health.

## 7. Co-op Gameplay

The MVP supports up to four players in the same dungeon run.

Players share the same dungeon and enemy encounters. Everyone sees the
same major game events.

### Cooperation

Players can:

-   Fight the same enemies.
-   Cover different areas.
-   Combine character abilities.
-   Help a downed teammate.
-   Coordinate weapon and positioning choices.
-   Focus the same high-priority enemy.

### Downed and revive system

When a player's health reaches zero, they become **Downed** rather than
immediately ending the run.

A teammate can interact with the downed player to revive them.

``` text
Normal
  ↓
Downed
  ↓
Reviving
  ↓
Alive
```

If nobody revives the player before the timer expires, that player is
eliminated for the remainder of the encounter/run according to the MVP
rule set.

### Shared versus individual state

The dungeon, enemies, and major encounter progression are shared.

Player health, currently equipped weapons, position, cooldowns, and
individual skills remain player-specific.

## 8. Platforms and Delivery

### Game application

The game will be developed in **Godot 4 using GDScript**, a game-focused
technology stack suited to 2D gameplay and exportable builds. The
initial targets are:

-   **Windows PC:** keyboard and mouse controls.
-   **Android:** touch controls designed for a phone or tablet.

The project should be structured so iOS can be evaluated later, rather
than making it a release requirement before the core game is proven.

### Multiplayer and player data

A shared C#/.NET game server will coordinate multiplayer sessions and
validate important gameplay outcomes. Firebase will store only selected
persistent data, such as player profiles or unlocks if those features
are included. Live combat and movement will not be saved continuously to
the database.

### Website

The website is a separate product-facing page, not a place where players
run the game. It will provide: - Game overview and screenshots. -
Supported platforms and basic requirements. - Download links to the
current approved PC/mobile builds. - Version information and release
notes. - Support and privacy information as applicable.

## 9. MVP Success Criteria

The MVP is successful when a small group can:

1.  Enter a multiplayer room.
2.  Spawn in the same dungeon.
3.  Move and fight without noticeable desynchronization.
4.  Clear multiple procedurally arranged rooms.
5.  Find and equip new weapons.
6.  Use distinct character skills.
7.  Revive a teammate.
8.  Defeat the boss.
9.  Finish the run and start another run with a different dungeon
    layout.

The priority is **a complete, repeatable co-op game loop**, not content
volume.

## 10. Explicitly Out of Scope for MVP

To control scope, the first release should exclude:

-   Dozens of characters.
-   Hundreds of weapons.
-   Complex permanent meta-progression.
-   Multiple game modes.
-   PvP.
-   Trading.
-   Social systems.
-   Native PC/mobile packaging details beyond the agreed initial
    platforms.
-   Large-scale matchmaking.
-   Cosmetic economies.
-   Procedurally generated artwork.

These can be considered after the core loop is proven.

## Release readiness checklist

-   [ ] The Windows application installs or launches and can reach the
    game server.
-   [ ] The Android build runs on a supported physical device with
    usable touch controls.
-   [ ] PC and Android players can join the same cooperative session.
-   [ ] A complete dungeon run can end in victory or defeat and be
    restarted.
-   [ ] The official website links to the correct current release for
    each supported platform.
-   [ ] The team has documented known issues and minimum supported
    requirements.
