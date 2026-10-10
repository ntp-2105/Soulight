import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Input: {
      Keyboard: {
        KeyCodes: {
          W: 87,
          A: 65,
          S: 83,
          D: 68,
          E: 69,
          ONE: 49,
          TWO: 50,
          THREE: 51,
          R: 82,
          ENTER: 13,
          UP: 38,
          LEFT: 37,
          DOWN: 40,
          RIGHT: 39,
          SPACE: 32,
          SHIFT: 16,
        },
      },
    },
    Core: { Events: { BLUR: 'blur' } },
    Scenes: { Events: { PAUSE: 'pause', SLEEP: 'sleep', SHUTDOWN: 'shutdown' } },
  },
}));

import Phaser from 'phaser';
import { InputController } from '../src/game/input/InputController';

type Listener = (...args: never[]) => void;

interface ListenerRecord {
  listener: Listener;
  once: boolean;
}

class FakeEmitter {
  private readonly listeners = new Map<string, ListenerRecord[]>();

  on(event: string, listener: Listener): this {
    this.add(event, listener, false);
    return this;
  }

  once(event: string, listener: Listener): this {
    this.add(event, listener, true);
    return this;
  }

  off(event: string, listener: Listener): this {
    const records = this.listeners.get(event) ?? [];
    this.listeners.set(event, records.filter((record) => record.listener !== listener));
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const records = [...(this.listeners.get(event) ?? [])];
    for (const record of records) {
      if (record.once) this.off(event, record.listener);
      record.listener(...args as never[]);
    }
    return records.length > 0;
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  private add(event: string, listener: Listener, once: boolean): void {
    const records = this.listeners.get(event) ?? [];
    records.push({ listener, once });
    this.listeners.set(event, records);
  }
}

interface Harness {
  controller: InputController;
  input: FakeEmitter;
  gameEvents: FakeEmitter;
  sceneEvents: FakeEmitter;
  key: (code: number) => FakeEmitter;
}

function createHarness(): Harness {
  const keys = new Map<number, FakeEmitter>();
  const keyboard = {
    addKey(code: number) {
      const key = new FakeEmitter();
      keys.set(code, key);
      return key;
    },
  };
  const input = Object.assign(new FakeEmitter(), { keyboard });
  const gameEvents = new FakeEmitter();
  const sceneEvents = new FakeEmitter();
  const scene = {
    input,
    game: { events: gameEvents, loop: { frame: 42 } },
    events: sceneEvents,
  } as unknown as Phaser.Scene;

  return {
    controller: new InputController(scene),
    input,
    gameEvents,
    sceneEvents,
    key(code: number) {
      const result = keys.get(code);
      if (!result) throw new Error(`Missing fake key ${code}`);
      return result;
    },
  };
}

const K = () => Phaser.Input.Keyboard.KeyCodes;

describe('InputController concurrent state', () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
  });

  it.each([
    ['WASD', K().A],
    ['arrows', K().LEFT],
  ] as const)('moves and aims with %s', (_name, code) => {
    harness.key(code).emit('down');
    expect(harness.controller.read()).toMatchObject({ moveX: -1, moveY: 0, aimX: -1, aimY: 0, fire: false });
  });

  it('keeps moving while one of two keys for a direction is still held', () => {
    harness.key(K().W).emit('down');
    harness.key(K().UP).emit('down');
    harness.key(K().W).emit('up');
    expect(harness.controller.read()).toMatchObject({ moveY: -1 });

    harness.key(K().UP).emit('up');
    expect(harness.controller.read()).toMatchObject({ moveY: 0, aimX: 0, aimY: -1 });
  });

  it('fires with Space while moving diagonally', () => {
    harness.key(K().W).emit('down');
    harness.key(K().RIGHT).emit('down');
    harness.key(K().SPACE).emit('down');

    const input = harness.controller.read();
    expect(input.fire).toBe(true);
    expect(input.moveX).toBeCloseTo(Math.SQRT1_2);
    expect(input.aimY).toBeCloseTo(-Math.SQRT1_2);

    harness.key(K().SPACE).emit('up');
    expect(harness.controller.read().fire).toBe(false);
  });

  it('latches a fast Space tap until one frame consumes it', () => {
    harness.key(K().SPACE).emit('down');
    harness.key(K().SPACE).emit('up');

    expect(harness.controller.read().fire).toBe(true);
    expect(harness.controller.read().fire).toBe(false);
  });

  it('ignores the mouse entirely', () => {
    expect(harness.input.listenerCount('pointerdown')).toBe(0);
  });

  it.each([
    ['blur', 'game'],
    ['pause', 'scene'],
    ['sleep', 'scene'],
  ] as const)('clears held input on %s', (event, target) => {
    harness.key(K().S).emit('down');
    harness.key(K().SPACE).emit('down');

    if (target === 'game') harness.gameEvents.emit(event);
    if (target === 'scene') harness.sceneEvents.emit(event);

    expect(harness.controller.read()).toMatchObject({ moveX: 0, moveY: 0, fire: false });
  });

  it('stamps each read with an increasing sequence and the client frame', () => {
    expect(harness.controller.read()).toMatchObject({ sequence: 1, clientTick: 42 });
    expect(harness.controller.read().sequence).toBe(2);
  });

  it('maps Shift to ability and E to interact without firing', () => {
    harness.key(K().SHIFT).emit('down');
    harness.key(K().E).emit('down');
    expect(harness.controller.read()).toMatchObject({ ability: true, interact: true, fire: false });

    harness.key(K().SHIFT).emit('up');
    harness.key(K().E).emit('up');
    expect(harness.controller.read()).toMatchObject({ ability: false, interact: false });
  });

  it('consumes weapon and restart commands once', () => {
    harness.key(K().TWO).emit('down');
    harness.key(K().R).emit('down');

    expect(harness.controller.selectedWeapon()).toBe('shotgun');
    expect(harness.controller.selectedWeapon()).toBeNull();
    expect(harness.controller.restartPressed()).toBe(true);
    expect(harness.controller.restartPressed()).toBe(false);
  });

  it('clears state and detaches every listener on shutdown', () => {
    const moveKey = harness.key(K().UP);
    const fireKey = harness.key(K().SPACE);
    const weaponKey = harness.key(K().ONE);
    moveKey.emit('down');
    fireKey.emit('down');
    harness.sceneEvents.emit('shutdown');

    moveKey.emit('down');
    fireKey.emit('down');
    weaponKey.emit('down');

    expect(harness.controller.read()).toMatchObject({ moveX: 0, moveY: 0, fire: false });
    expect(harness.controller.selectedWeapon()).toBeNull();
    expect(moveKey.listenerCount('down')).toBe(0);
    expect(harness.gameEvents.listenerCount('blur')).toBe(0);
    expect(harness.sceneEvents.listenerCount('pause')).toBe(0);
  });
});
