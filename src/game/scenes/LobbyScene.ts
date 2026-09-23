import Phaser from 'phaser';
import { ACTOR_FRAMES, ASSET_KEYS, DUNGEON_FRAMES, GAME_FONT, PROMPT_FRAMES } from '../../data/assets';

export class LobbyScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super('LobbyScene');
  }

  create(): void {
    this.started = false;
    this.cameras.main.setBackgroundColor('#17120f');
    this.drawBackdrop();
    this.add.nineslice(640, 354, ASSET_KEYS.PANEL, undefined, 760, 510, 16, 16, 16, 16).setDepth(2);

    this.add.text(640, 205, 'SOULIGHT', {
      fontFamily: GAME_FONT,
      fontSize: '74px',
      color: '#ffe3a1',
      stroke: '#4f2f20',
      strokeThickness: 10,
    }).setOrigin(0.5).setDepth(3);
    this.add.text(640, 276, 'THE FORGOTTEN DUNGEON', {
      fontFamily: GAME_FONT,
      fontSize: '18px',
      color: '#d1ad73',
      letterSpacing: 3,
    }).setOrigin(0.5).setDepth(3);

    const button = this.add.nineslice(640, 382, ASSET_KEYS.PANEL_INLAY, undefined, 330, 72, 14, 14, 14, 14)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);
    const buttonLabel = this.add.text(640, 382, 'ENTER THE ARENA', {
      fontFamily: GAME_FONT,
      fontSize: '24px',
      color: '#fff0bd',
      stroke: '#3a2418',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(4);
    button.on('pointerover', () => { button.setTint(0xf3cf81); buttonLabel.setScale(1.04); });
    button.on('pointerout', () => { button.clearTint(); buttonLabel.setScale(1); });
    button.on('pointerdown', () => this.startGame());

    this.addPromptRow();
    this.add.text(640, 565, 'PRESS ENTER TO BEGIN', {
      fontFamily: GAME_FONT,
      fontSize: '14px',
      color: '#987b58',
    }).setOrigin(0.5).setDepth(3);

    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
  }

  private startGame(): void {
    if (this.started) return;
    this.started = true;
    this.cameras.main.fadeOut(220, 20, 12, 8);
    this.time.delayedCall(230, () => this.scene.start('DungeonScene'));
  }

  private drawBackdrop(): void {
    this.add.tileSprite(640, 360, 1280, 720, ASSET_KEYS.DUNGEON, DUNGEON_FRAMES.FLOOR)
      .setTileScale(3)
      .setTint(0x807166)
      .setDepth(0);
    const vignette = this.add.image(640, 360, ASSET_KEYS.PANEL_INLAY).setDisplaySize(1240, 680).setAlpha(0.2).setDepth(1);
    vignette.setTint(0x251a15);

    for (const x of [338, 942]) {
      const torch = this.add.image(x, 200, ASSET_KEYS.ACTORS, ACTOR_FRAMES.TORCH).setDisplaySize(64, 64).setDepth(4);
      this.tweens.add({ targets: torch, alpha: { from: 0.72, to: 1 }, scaleX: { from: 3.8, to: 4.1 }, scaleY: { from: 3.8, to: 4.1 }, duration: 420, yoyo: true, repeat: -1 });
    }
  }

  private addPromptRow(): void {
    const keyFrames = [PROMPT_FRAMES.W, PROMPT_FRAMES.A, PROMPT_FRAMES.S, PROMPT_FRAMES.D];
    keyFrames.forEach((frame, index) => {
      this.add.image(438 + index * 27, 492, ASSET_KEYS.PROMPTS, frame).setDisplaySize(24, 24).setDepth(4);
    });
    this.add.text(548, 492, 'MOVE', { fontFamily: GAME_FONT, fontSize: '14px', color: '#d5bd95' }).setOrigin(0, 0.5).setDepth(4);
    this.add.image(646, 492, ASSET_KEYS.PROMPTS, PROMPT_FRAMES.MOUSE_LEFT).setDisplaySize(24, 24).setDepth(4);
    this.add.text(666, 492, 'AIM / ATTACK', { fontFamily: GAME_FONT, fontSize: '14px', color: '#d5bd95' }).setOrigin(0, 0.5).setDepth(4);
    [PROMPT_FRAMES.ONE, PROMPT_FRAMES.TWO, PROMPT_FRAMES.THREE].forEach((frame, index) => {
      this.add.image(820 + index * 27, 492, ASSET_KEYS.PROMPTS, frame).setDisplaySize(24, 24).setDepth(4);
    });
  }
}
