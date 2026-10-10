import Phaser from 'phaser';
import type { PlayerInput, Vector2Like } from '../types';
import type { WeaponId } from '../../gameplay/weapons/WeaponDefinition';
import { composePlayerInput, type HeldInputState } from './InputMath';

type Direction = 'up' | 'left' | 'down' | 'right';

interface DirectionBinding {
  direction: Direction;
  key: Phaser.Input.Keyboard.Key;
  pressed: boolean;
  down: () => void;
  up: () => void;
}

export class InputController {
  private readonly keys: Record<'fire' | 'ability' | 'interact' | 'one' | 'two' | 'three' | 'restart' | 'enter', Phaser.Input.Keyboard.Key>;
  private readonly held: HeldInputState = {
    up: false,
    left: false,
    down: false,
    right: false,
    fire: false,
    ability: false,
    interact: false,
  };
  private readonly directionBindings: DirectionBinding[] = [];
  private lastAim: Vector2Like = { x: 1, y: 0 };
  private sequence = 0;
  private pendingFire = false;
  private pendingWeapon: WeaponId | null = null;
  private pendingRestart = false;

  private readonly selectPistol = () => { this.pendingWeapon = 'pistol'; };
  private readonly selectShotgun = () => { this.pendingWeapon = 'shotgun'; };
  private readonly selectSword = () => { this.pendingWeapon = 'sword'; };
  private readonly requestRestart = () => { this.pendingRestart = true; };
  private readonly startInteract = () => { this.held.interact = true; };
  private readonly stopInteract = () => { this.held.interact = false; };
  // ponytail: ability is held-only, so a tap shorter than one frame is missed; latch it like fire when M5 uses it.
  private readonly startFire = () => {
    this.held.fire = true;
    this.pendingFire = true;
  };
  private readonly stopFire = () => { this.held.fire = false; };
  private readonly startAbility = () => { this.held.ability = true; };
  private readonly stopAbility = () => { this.held.ability = false; };
  private readonly resetHeldInput = () => {
    for (const key of Object.keys(this.held) as (keyof HeldInputState)[]) this.held[key] = false;
    for (const binding of this.directionBindings) binding.pressed = false;
    this.pendingFire = false;
  };
  private readonly destroy = () => {
    for (const binding of this.directionBindings) {
      binding.key.off('down', binding.down);
      binding.key.off('up', binding.up);
    }
    this.keys.fire.off('down', this.startFire);
    this.keys.fire.off('up', this.stopFire);
    this.keys.ability.off('down', this.startAbility);
    this.keys.ability.off('up', this.stopAbility);
    this.keys.interact.off('down', this.startInteract);
    this.keys.interact.off('up', this.stopInteract);
    this.keys.one.off('down', this.selectPistol);
    this.keys.two.off('down', this.selectShotgun);
    this.keys.three.off('down', this.selectSword);
    this.keys.restart.off('down', this.requestRestart);
    this.keys.enter.off('down', this.requestRestart);
    this.scene.game.events.off(Phaser.Core.Events.BLUR, this.resetHeldInput);
    this.scene.events.off(Phaser.Scenes.Events.PAUSE, this.resetHeldInput);
    this.scene.events.off(Phaser.Scenes.Events.SLEEP, this.resetHeldInput);
    this.resetHeldInput();
    this.pendingWeapon = null;
    this.pendingRestart = false;
  };

  constructor(private readonly scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is required for the offline prototype.');

    const codes = Phaser.Input.Keyboard.KeyCodes;
    const directionCodes: Record<Direction, number[]> = {
      up: [codes.W, codes.UP],
      left: [codes.A, codes.LEFT],
      down: [codes.S, codes.DOWN],
      right: [codes.D, codes.RIGHT],
    };
    for (const [direction, keyCodes] of Object.entries(directionCodes) as [Direction, number[]][]) {
      for (const code of keyCodes) this.bindDirection(direction, keyboard.addKey(code));
    }

    this.keys = {
      fire: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      ability: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      interact: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      one: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      two: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      three: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      restart: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      enter: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
    };
    this.keys.fire.on('down', this.startFire);
    this.keys.fire.on('up', this.stopFire);
    this.keys.ability.on('down', this.startAbility);
    this.keys.ability.on('up', this.stopAbility);

    this.keys.interact.on('down', this.startInteract);
    this.keys.interact.on('up', this.stopInteract);
    this.keys.one.on('down', this.selectPistol);
    this.keys.two.on('down', this.selectShotgun);
    this.keys.three.on('down', this.selectSword);
    this.keys.restart.on('down', this.requestRestart);
    this.keys.enter.on('down', this.requestRestart);
    scene.game.events.on(Phaser.Core.Events.BLUR, this.resetHeldInput);
    scene.events.on(Phaser.Scenes.Events.PAUSE, this.resetHeldInput);
    scene.events.on(Phaser.Scenes.Events.SLEEP, this.resetHeldInput);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy);
  }

  read(): PlayerInput {
    const input = composePlayerInput(this.held, this.lastAim);
    if (this.pendingFire) input.fire = true;
    this.pendingFire = false;
    this.lastAim = { x: input.aimX, y: input.aimY };
    this.sequence += 1;
    return { sequence: this.sequence, clientTick: this.scene.game.loop.frame, ...input };
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

  private bindDirection(direction: Direction, key: Phaser.Input.Keyboard.Key): void {
    // Two keys share a direction, so releasing W must not cancel a held Up arrow.
    const sync = () => {
      this.held[direction] = this.directionBindings.some((other) => other.direction === direction && other.pressed);
    };
    const binding: DirectionBinding = {
      direction,
      key,
      pressed: false,
      down: () => { binding.pressed = true; sync(); },
      up: () => { binding.pressed = false; sync(); },
    };
    key.on('down', binding.down);
    key.on('up', binding.up);
    this.directionBindings.push(binding);
  }
}
