import Phaser from 'phaser';
import type { PlayerInput, Vector2Like } from '../types';
import type { WeaponId } from '../../gameplay/weapons/WeaponDefinition';
import { normalizeAim, normalizeMovement } from './InputMath';

export class InputController {
  private readonly keys: Record<'up' | 'left' | 'down' | 'right' | 'one' | 'two' | 'three' | 'restart' | 'enter', Phaser.Input.Keyboard.Key>;
  private lastAim: Vector2Like = { x: 1, y: 0 };
  private pendingWeapon: WeaponId | null = null;
  private pendingRestart = false;

  constructor(private readonly scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is required for the offline prototype.');

    this.keys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      one: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      two: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      three: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      restart: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      enter: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
    };
    this.keys.one.on('down', () => { this.pendingWeapon = 'pistol'; });
    this.keys.two.on('down', () => { this.pendingWeapon = 'shotgun'; });
    this.keys.three.on('down', () => { this.pendingWeapon = 'sword'; });
    this.keys.restart.on('down', () => { this.pendingRestart = true; });
    this.keys.enter.on('down', () => { this.pendingRestart = true; });
    keyboard.on('keydown', this.handleKeyDown, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keyboard.off('keydown', this.handleKeyDown, this));
  }

  read(origin: Vector2Like): PlayerInput {
    const rawX = Number(this.keys.right.isDown) - Number(this.keys.left.isDown);
    const rawY = Number(this.keys.down.isDown) - Number(this.keys.up.isDown);
    const movement = normalizeMovement(rawX, rawY);
    const pointer = this.scene.input.activePointer;
    this.lastAim = normalizeAim(pointer.worldX - origin.x, pointer.worldY - origin.y, this.lastAim);

    return {
      moveX: movement.x,
      moveY: movement.y,
      aimX: this.lastAim.x,
      aimY: this.lastAim.y,
      fire: pointer.isDown && pointer.leftButtonDown(),
    };
  }

  selectedWeapon(): WeaponId | null {
    const selection = this.pendingWeapon;
    this.pendingWeapon = null;
    return selection;
  }

  restartPressed(): boolean {
    const pressed = this.pendingRestart;
    this.pendingRestart = false;
    return pressed;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Digit1' || event.key === '1') this.pendingWeapon = 'pistol';
    if (event.code === 'Digit2' || event.key === '2') this.pendingWeapon = 'shotgun';
    if (event.code === 'Digit3' || event.key === '3') this.pendingWeapon = 'sword';
    if (event.code === 'KeyR' || event.key.toLowerCase() === 'r' || event.code === 'Enter') this.pendingRestart = true;
  }
}
