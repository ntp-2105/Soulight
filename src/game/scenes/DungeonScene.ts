import Phaser from 'phaser';
import { GAME_WIDTH } from '../../data/balance';
import { ACTOR_FRAMES, ASSET_KEYS, DUNGEON_FRAMES, GAME_FONT } from '../../data/assets';
import { generateDungeon, TILE, TILE_SIZE, type Dungeon } from '../../gameplay/dungeon/DungeonGenerator';
import type { NetworkSession } from '../../network/NetworkSession';
import { Player } from '../entities/Player';
import { InputController } from '../input/InputController';
import { EnemyRenderer } from '../renderers/EnemyRenderer';
import { PlayerRenderer } from '../renderers/PlayerRenderer';
import { ProjectileRenderer } from '../renderers/ProjectileRenderer';
import { CombatSystem } from '../systems/CombatSystem';
import { EffectsSystem } from '../systems/EffectsSystem';
import { resolveGamePhase } from '../systems/GameFlow';
import { WaveSystem } from '../systems/WaveSystem';
import { WeaponSystem } from '../systems/WeaponSystem';
import { GamePhase } from '../types';
import type { PlayerInput } from '../types';
import { Hud } from '../ui/Hud';

const idleInput = (): PlayerInput => ({
  sequence: 0,
  clientTick: 0,
  moveX: 0,
  moveY: 0,
  aimX: 1,
  aimY: 0,
  fire: false,
  ability: false,
  interact: false,
});

export class DungeonScene extends Phaser.Scene {
  private phase = GamePhase.Ready;
  private player!: Player;
  private inputController!: InputController;
  private playerRenderer!: PlayerRenderer;
  private enemyRenderer!: EnemyRenderer;
  private projectileRenderer!: ProjectileRenderer;
  private wave!: WaveSystem;
  private weapons!: WeaponSystem;
  private combat!: CombatSystem;
  private hud!: Hud;
  private readyUntil = 0;
  private lastInput: PlayerInput = idleInput();
  private session: NetworkSession | undefined;
  private remotePlayers = new Map<string, Phaser.GameObjects.Image>();
  private roomLabel: Phaser.GameObjects.Text | undefined;

  constructor() {
    super('DungeonScene');
  }

  create(data?: { session?: NetworkSession }): void {
    this.session = data?.session;
    this.remotePlayers = new Map();
    this.phase = GamePhase.Ready;
    this.lastInput = idleInput();
    this.cameras.main.setBackgroundColor('#17120f');
    this.cameras.main.fadeIn(250);
    const dungeon = generateDungeon(Math.floor(Math.random() * 2 ** 31));
    const walls = this.buildWorld(dungeon);
    const worldW = dungeon.width * TILE_SIZE, worldH = dungeon.height * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // ponytail: multiplayer spawn from the server is ignored; the dungeon is local to each client until the server owns the seed.
    const spawn = dungeon.rooms[dungeon.startRoomId]!.playerSpawns[0]!;
    this.player = new Player(this, spawn.x, spawn.y);
    this.cameras.main.setBounds(0, 0, worldW, worldH).startFollow(this.player, true, 0.12, 0.12);
    this.roomLabel = this.session && this.add.text(GAME_WIDTH / 2, 24, '', {
      fontFamily: GAME_FONT,
      fontSize: '16px',
      color: '#fff1c9',
      stroke: '#3a2418',
      strokeThickness: 4,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);
    this.inputController = new InputController(this);
    this.playerRenderer = new PlayerRenderer(this, this.player);
    this.enemyRenderer = new EnemyRenderer(this);
    this.projectileRenderer = new ProjectileRenderer(this);
    const effects = new EffectsSystem(this);
    this.wave = new WaveSystem(this, this.enemyRenderer, effects);
    this.weapons = new WeaponSystem(this, this.player, effects);
    this.wave.spawn(dungeon.rooms.filter((r) => r.type !== 'start').flatMap((r) => [...r.enemySpawns, ...(r.bossSpawn ? [r.bossSpawn] : [])]));
    this.combat = new CombatSystem(
      this,
      this.player,
      this.playerRenderer,
      this.enemyRenderer,
      this.wave,
      this.weapons.projectiles,
      walls,
      effects,
      {
        onPlayerDamaged: () => this.evaluatePhase(),
        onEnemyKilled: () => this.evaluatePhase(),
      },
    );
    this.combat.setEnabled(false);
    this.hud = new Hud(this);
    this.hud.showReady();
    this.readyUntil = this.time.now + 850;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.playerRenderer.destroy();
      this.enemyRenderer.destroy();
    });
  }

  update(): void {
    if (!this.player?.active) return;
    if (this.phase === GamePhase.Ready && this.time.now >= this.readyUntil) {
      this.phase = GamePhase.Playing;
      this.combat.setEnabled(true);
      this.hud.clearOverlay();
    }
    this.lastInput = this.inputController.read();
    const selected = this.inputController.selectedWeapon();
    if (selected) this.weapons.select(selected);

    if (this.phase === GamePhase.Playing) this.player.move(this.lastInput);
    else this.player.stop();

    this.playerRenderer.update(
      { x: this.lastInput.aimX, y: this.lastInput.aimY },
      this.weapons.currentWeapon.id,
    );
    this.wave.update(this.player, this.phase === GamePhase.Playing);
    this.weapons.update(this.lastInput, this.combat, this.phase === GamePhase.Playing);
    this.session?.sendInput(this.lastInput);
    this.syncRemotePlayers();
    this.projectileRenderer.update(this.weapons.activeProjectiles());
    this.enemyRenderer.update();
    this.hud.update(
      this.player,
      this.weapons.currentWeapon,
      this.weapons.cooldownRatio(this.time.now),
      this.wave.livingCount(),
      { x: this.player.x + this.lastInput.aimX * 64, y: this.player.y + this.lastInput.aimY * 64 },
    );

    // Consume every frame so a press during combat cannot skip the result screen.
    const restartPressed = this.inputController.restartPressed();
    if (restartPressed && (this.phase === GamePhase.Victory || this.phase === GamePhase.Defeat)) {
      this.restart();
    }
  }

  private evaluatePhase(): void {
    if (this.phase !== GamePhase.Playing) return;
    const nextPhase = resolveGamePhase(this.player.health, this.wave.livingCount());
    if (nextPhase === GamePhase.Playing) return;

    this.phase = nextPhase;
    this.combat.setEnabled(false);
    this.player.stop();
    this.wave.update(this.player, false);
    this.hud.showResult(nextPhase, () => this.restart());
  }

  private restart(): void {
    this.scene.restart({ session: this.session });
  }

  // Remote players stay at their spawn until M3 streams world snapshots.
  private syncRemotePlayers(): void {
    if (!this.session || !this.roomLabel) return;
    for (const [id, sprite] of this.remotePlayers) {
      if (this.session.players.has(id)) continue;
      sprite.destroy();
      this.remotePlayers.delete(id);
    }
    for (const remote of this.session.players.values()) {
      if (this.remotePlayers.has(remote.id)) continue;
      const sprite = this.add.image(remote.x, remote.y, ASSET_KEYS.ACTORS, ACTOR_FRAMES.PLAYER)
        .setDisplaySize(48, 48)
        .setTint(0x9fd3ff)
        .setAlpha(0.7)
        .setDepth(19);
      this.remotePlayers.set(remote.id, sprite);
    }
    this.roomLabel.setText(this.session.connected
      ? `ROOM ${this.session.roomId}  ·  ${this.session.players.size + 1}/4`
      : 'CONNECTION LOST');
  }

  /** Draws the tile grid as horizontal runs (one sprite per run, not per tile) and returns the wall colliders. */
  private buildWorld(d: Dungeon): Phaser.Physics.Arcade.StaticGroup {
    const walls = this.physics.add.staticGroup();
    const { width: w, height: h, tiles } = d;
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? TILE.wall : tiles[y * w + x]!);
    // Walls that touch floor are rendered/collidable; deep rock stays void.
    const isEdgeWall = (x: number, y: number) => {
      if (at(x, y) !== TILE.wall) return false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) !== TILE.wall) return true;
      return false;
    };
    const runs = (match: (x: number, y: number) => boolean, emit: (x: number, y: number, len: number) => void) => {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w;) {
          if (!match(x, y)) { x++; continue; }
          let len = 1;
          while (x + len < w && match(x + len, y)) len++;
          emit(x, y, len);
          x += len;
        }
      }
    };
    const rect = (x: number, y: number, len: number) => ({ cx: (x + len / 2) * TILE_SIZE, cy: (y + 0.5) * TILE_SIZE, pw: len * TILE_SIZE });

    runs((x, y) => at(x, y) !== TILE.wall, (x, y, len) => {
      const r = rect(x, y, len);
      this.add.tileSprite(r.cx, r.cy, r.pw, TILE_SIZE, ASSET_KEYS.DUNGEON, DUNGEON_FRAMES.FLOOR)
        .setTileScale(TILE_SIZE / 16).setTint(0xb6aaa0).setDepth(-10);
    });
    runs(isEdgeWall, (x, y, len) => {
      const r = rect(x, y, len);
      this.add.tileSprite(r.cx, r.cy, r.pw, TILE_SIZE, ASSET_KEYS.DUNGEON, DUNGEON_FRAMES.WALL)
        .setTileScale(TILE_SIZE / 16).setTint(0x74665e).setDepth(2);
      const wall = walls.create(r.cx, r.cy, ASSET_KEYS.DUNGEON, DUNGEON_FRAMES.WALL) as Phaser.Physics.Arcade.Image;
      wall.setVisible(false).setDisplaySize(r.pw, TILE_SIZE).refreshBody();
    });
    return walls;
  }
}
