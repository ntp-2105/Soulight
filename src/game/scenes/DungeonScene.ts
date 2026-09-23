import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, WALL_SIZE } from '../../data/balance';
import { ASSET_KEYS, DUNGEON_FRAMES } from '../../data/assets';
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
  private lastInput: PlayerInput = { moveX: 0, moveY: 0, aimX: 1, aimY: 0, fire: false };

  constructor() {
    super('DungeonScene');
  }

  create(): void {
    this.phase = GamePhase.Ready;
    this.cameras.main.setBackgroundColor('#17120f');
    this.cameras.main.fadeIn(250);
    this.drawArenaFloor();
    const walls = this.createWalls();

    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.inputController = new InputController(this);
    this.playerRenderer = new PlayerRenderer(this, this.player);
    this.enemyRenderer = new EnemyRenderer(this);
    this.projectileRenderer = new ProjectileRenderer(this);
    const effects = new EffectsSystem(this);
    this.wave = new WaveSystem(this, this.enemyRenderer, effects);
    this.weapons = new WeaponSystem(this, this.player, effects);
    this.wave.spawn();
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
    this.readyUntil = performance.now() + 850;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.playerRenderer.destroy();
      this.enemyRenderer.destroy();
    });
  }

  update(): void {
    if (!this.player?.active) return;
    if (this.phase === GamePhase.Ready && performance.now() >= this.readyUntil) {
      this.phase = GamePhase.Playing;
      this.combat.setEnabled(true);
      this.hud.clearOverlay();
    }
    this.lastInput = this.inputController.read(this.player);
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
    this.projectileRenderer.update(this.weapons.activeProjectiles());
    this.enemyRenderer.update();
    this.hud.update(
      this.player,
      this.weapons.currentWeapon,
      this.weapons.cooldownRatio(this.time.now),
      this.wave.livingCount(),
    );

    if ((this.phase === GamePhase.Victory || this.phase === GamePhase.Defeat) && this.inputController.restartPressed()) {
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
    this.scene.restart();
  }

  private drawArenaFloor(): void {
    this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, ASSET_KEYS.DUNGEON, DUNGEON_FRAMES.FLOOR)
      .setTileScale(3)
      .setTint(0xb6aaa0)
      .setDepth(-10);
    const decor = [
      { x: 180, y: 205, frame: DUNGEON_FRAMES.ROCK },
      { x: 1095, y: 510, frame: DUNGEON_FRAMES.ROCK },
      { x: 225, y: 535, frame: DUNGEON_FRAMES.MUSHROOM },
      { x: 1055, y: 185, frame: DUNGEON_FRAMES.MUSHROOM },
    ];
    for (const item of decor) {
      this.add.image(item.x, item.y, ASSET_KEYS.DUNGEON, item.frame).setDisplaySize(48, 48).setDepth(-5).setAlpha(0.72);
    }
  }

  private createWalls(): Phaser.Physics.Arcade.StaticGroup {
    const walls = this.physics.add.staticGroup();
    const addWall = (x: number, y: number, width: number, height: number) => {
      this.add.tileSprite(x, y, width, height, ASSET_KEYS.DUNGEON, DUNGEON_FRAMES.WALL)
        .setTileScale(3)
        .setTint(0x74665e)
        .setDepth(2);
      const wall = walls.create(x, y, ASSET_KEYS.DUNGEON, DUNGEON_FRAMES.WALL) as Phaser.Physics.Arcade.Image;
      wall.setVisible(false).setDisplaySize(width, height).refreshBody();
    };
    addWall(GAME_WIDTH / 2, WALL_SIZE / 2, GAME_WIDTH, WALL_SIZE);
    addWall(GAME_WIDTH / 2, GAME_HEIGHT - WALL_SIZE / 2, GAME_WIDTH, WALL_SIZE);
    addWall(WALL_SIZE / 2, GAME_HEIGHT / 2, WALL_SIZE, GAME_HEIGHT);
    addWall(GAME_WIDTH - WALL_SIZE / 2, GAME_HEIGHT / 2, WALL_SIZE, GAME_HEIGHT);
    return walls;
  }
}
