import { afterEach, describe, expect, it, vi } from 'vitest';
import { NetworkSession } from '../src/network/NetworkSession';

class FakeSocket extends EventTarget {
  static readonly OPEN = 1;
  static last: FakeSocket;
  readyState = 0;
  readonly sent: unknown[] = [];

  constructor(readonly url: string) {
    super();
    FakeSocket.last = this;
  }

  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }

  close(): void {
    this.readyState = 3;
  }

  open(): void {
    this.readyState = FakeSocket.OPEN;
    this.dispatchEvent(new Event('open'));
  }

  receive(message: unknown): void {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }));
  }
}

describe('NetworkSession', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('joins a room, tracks other players and sends inputs', async () => {
    vi.stubGlobal('WebSocket', FakeSocket);
    const pending = NetworkSession.connect(null, 'ws://test/ws');
    const socket = FakeSocket.last;
    socket.open();
    expect(socket.sent).toEqual([{ type: 'JOIN_ROOM', roomId: null }]);

    socket.receive({
      type: 'ROOM_JOINED',
      roomId: 'ABCDE',
      playerId: 'me',
      players: [{ id: 'me', x: 580, y: 320 }, { id: 'other', x: 700, y: 320 }],
    });
    const session = await pending;
    expect(session.spawn).toEqual({ id: 'me', x: 580, y: 320 });
    expect([...session.players.keys()]).toEqual(['other']);

    socket.receive({ type: 'ENTITY_SPAWN', player: { id: 'third', x: 580, y: 400 } });
    socket.receive({ type: 'ENTITY_DESPAWN', id: 'other' });
    expect([...session.players.keys()]).toEqual(['third']);

    // An error after joining must not tear down the session.
    socket.receive({ type: 'ERROR', reason: 'bad_input' });
    session.sendInput({ sequence: 1, clientTick: 1, moveX: 1, moveY: 0, aimX: 1, aimY: 0, fire: false, ability: false, interact: false });
    expect(session.connected).toBe(true);
    expect(socket.sent.at(-1)).toMatchObject({ type: 'PLAYER_INPUT', input: { sequence: 1 } });
  });

  it('rejects when the server refuses the join', async () => {
    vi.stubGlobal('WebSocket', FakeSocket);
    const pending = NetworkSession.connect('NOPE1', 'ws://test/ws');
    FakeSocket.last.open();
    FakeSocket.last.receive({ type: 'ERROR', reason: 'room_not_found' });
    await expect(pending).rejects.toThrow('room_not_found');
    expect(FakeSocket.last.readyState).toBe(3);
  });
});
