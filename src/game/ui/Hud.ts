import Phaser from 'phaser';
import { ACTOR_FRAMES, ASSET_KEYS, GAME_FONT, PROMPT_FRAMES } from '../../data/assets';
import type { Player } from '../entities/Player';
import { GamePhase, type Vector2Like } from '../types';
import type { WeaponDefinition } from '../../gameplay/weapons/WeaponDefinition';

export class Hud {
  private readonly healthText: Phaser.GameObjects.Text;
  private readonly weaponText: Phaser.GameObjects.Text;
  private readonly enemyText: Phaser.GameObjects.Text;
  private readonly healthFill: Phaser.GameObjects.Image;
  private readonly cooldownFill: Phaser.GameObjects.Image;
  private readonly weaponIcon: Phaser.GameObjects.Image;
  private readonly crosshair: Phaser.GameObjects.Image;
  private overlay: Phaser.GameObjects.Container | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: GAME_FONT,
      fontSize: '17px',
      color: '#fff1c9',
      stroke: '#3a2418',
      strokeThickness: 4,
    };
    scene.add.nineslice(126, 56, ASSET_KEYS.PANEL, undefined, 224, 96, 16, 16, 16, 16).setScrollFactor(0).setDepth(98);
    scene.add.nineslice(1158, 50, ASSET_KEYS.PANEL, undefined, 202, 72, 16, 16, 16, 16).setScrollFactor(0).setDepth(98);
    scene.add.image(1192, 50, ASSET_KEYS.ACTORS, ACTOR_FRAMES.ENEMY).setDisplaySize(34, 34).setScrollFactor(0).setDepth(100);
    scene.add.image(135, 38, ASSET_KEYS.PANEL_INLAY).setDisplaySize(148, 13).setScrollFactor(0).setDepth(99);
    this.healthFill = scene.add.image(62, 38, ASSET_KEYS.PANEL).setOrigin(0, 0.5).setDisplaySize(146, 9).setTint(0xb83b32).setScrollFactor(0).setDepth(100);
    scene.add.image(135, 76, ASSET_KEYS.PANEL_INLAY).setDisplaySize(148, 10).setScrollFactor(0).setDepth(99);
    this.cooldownFill = scene.add.image(62, 76, ASSET_KEYS.PANEL).setOrigin(0, 0.5).setDisplaySize(146, 6).setTint(0x7f65b2).setScrollFactor(0).setDepth(100);
    this.weaponIcon = scene.add.image(42, 72, ASSET_KEYS.ACTORS, ACTOR_FRAMES.WEAPONS.pistol).setDisplaySize(32, 32).setScrollFactor(0).setDepth(101);
    this.healthText = scene.add.text(62, 18, '', labelStyle).setScrollFactor(0).setDepth(101);
    this.weaponText = scene.add.text(62, 52, '', { ...labelStyle, fontSize: '14px' }).setScrollFactor(0).setDepth(101);
    this.enemyText = scene.add.text(1166, 38, '', labelStyle).setOrigin(1, 0).setScrollFactor(0).setDepth(101);
    this.crosshair = scene.add.image(0, 0, ASSET_KEYS.CROSSHAIR).setDisplaySize(38, 38).setDepth(110);

    scene.add.nineslice(640, 692, ASSET_KEYS.PANEL, undefined, 760, 48, 16, 16, 16, 16).setScrollFactor(0).setDepth(98);
    this.addControls();
  }

  update(
    player: Player,
    weapon: WeaponDefinition,
    cooldownRatio: number,
    enemyCount: number,
    aimTarget: Vector2Like | null,
  ): void {
    const healthRatio = player.health / player.maxHealth;
    this.healthText.setText(`VITALITY ${player.health.toString().padStart(3, '0')}`);
    this.healthText.setColor(player.health <= 30 ? '#ff9a7c' : '#fff1c9');
    this.healthFill.setDisplaySize(Math.max(1, 146 * healthRatio), 9);
    this.weaponText.setText(weapon.name.toUpperCase());
    this.weaponIcon.setFrame(ACTOR_FRAMES.WEAPONS[weapon.id]);
    this.cooldownFill.setDisplaySize(Math.max(1, 146 * cooldownRatio), 6).setTint(weapon.color);
    this.enemyText.setText(`FOES  ${enemyCount}`);
    this.crosshair.setTint(weapon.color);
    if (aimTarget) this.crosshair.setPosition(aimTarget.x, aimTarget.y);
    this.crosshair.setVisible(aimTarget !== null);
  }

  showReady(): void {
    this.showOverlay('STEEL YOURSELF', 'Defeat every creature', false);
  }

  clearOverlay(): void {
    this.overlay?.destroy(true);
    this.overlay = null;
  }

  showResult(phase: GamePhase, onRestart: () => void): void {
    const victory = phase === GamePhase.Victory;
    this.showOverlay(victory ? 'CHAMBER CLEARED' : 'THE DUNGEON CLAIMS YOU', victory ? 'Every creature has fallen' : 'Your vitality was exhausted', true, onRestart);
  }

  private addControls(): void {
    const frames = [PROMPT_FRAMES.W, PROMPT_FRAMES.A, PROMPT_FRAMES.S, PROMPT_FRAMES.D];
    frames.forEach((frame, index) => {
      this.scene.add.image(332 + index * 22, 692, ASSET_KEYS.PROMPTS, frame).setDisplaySize(20, 20).setScrollFactor(0).setDepth(101);
    });
    this.scene.add.text(423, 692, 'MOVE / AIM', { fontFamily: GAME_FONT, fontSize: '12px', color: '#d5bd95' }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
    PROMPT_FRAMES.SPACE.forEach((frame, index) => {
      this.scene.add.image(510 + index * 20, 692, ASSET_KEYS.PROMPTS, frame).setDisplaySize(20, 20).setScrollFactor(0).setDepth(101);
    });
    this.scene.add.text(560, 692, 'ATTACK', { fontFamily: GAME_FONT, fontSize: '12px', color: '#d5bd95' }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
    [PROMPT_FRAMES.ONE, PROMPT_FRAMES.TWO, PROMPT_FRAMES.THREE].forEach((frame, index) => {
      this.scene.add.image(630 + index * 22, 692, ASSET_KEYS.PROMPTS, frame).setDisplaySize(20, 20).setScrollFactor(0).setDepth(101);
    });
    this.scene.add.text(700, 692, 'CHANGE WEAPON', { fontFamily: GAME_FONT, fontSize: '12px', color: '#d5bd95' }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
  }

  private showOverlay(title: string, subtitle: string, actionable: boolean, onAction?: () => void): void {
    this.clearOverlay();
    const shade = this.scene.add.rectangle(640, 360, 1280, 720, 0x120d0a, actionable ? 0.72 : 0.34);
    const panel = this.scene.add.nineslice(640, 360, ASSET_KEYS.PANEL, undefined, actionable ? 650 : 540, actionable ? 260 : 176, 16, 16, 16, 16);
    const heading = this.scene.add.text(640, actionable ? 316 : 340, title, {
      fontFamily: GAME_FONT,
      fontSize: actionable ? '34px' : '28px',
      color: actionable ? '#ffe09a' : '#f0c879',
      stroke: '#45291c',
      strokeThickness: 6,
      align: 'center',
      wordWrap: { width: 570 },
    }).setOrigin(0.5);
    const detail = this.scene.add.text(640, actionable ? 372 : 390, subtitle, {
      fontFamily: GAME_FONT,
      fontSize: '15px',
      color: '#d5bd95',
    }).setOrigin(0.5);
    const children: Phaser.GameObjects.GameObject[] = [shade, panel, heading, detail];

    if (actionable && onAction) {
      const button = this.scene.add.nineslice(640, 435, ASSET_KEYS.PANEL_INLAY, undefined, 320, 58, 14, 14, 14, 14)
        .setInteractive({ useHandCursor: true });
      const label = this.scene.add.text(640, 435, 'RETURN  [ R / ENTER ]', {
        fontFamily: GAME_FONT,
        fontSize: '15px',
        color: '#fff1c9',
      }).setOrigin(0.5);
      button.on('pointerover', () => button.setTint(0xe2ba72));
      button.on('pointerout', () => button.clearTint());
      button.on('pointerdown', onAction);
      children.push(button, label);
    }
    this.overlay = this.scene.add.container(0, 0, children).setScrollFactor(0).setDepth(200);
  }
}
