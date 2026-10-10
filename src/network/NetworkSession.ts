import type { PlayerInput, Vector2Like } from '../game/types';

export interface NetPlayer extends Vector2Like {
  id: string;
}

type ServerMessage =
  | { type: 'ROOM_JOINED'; roomId: string; playerId: string; players: NetPlayer[] }
  | { type: 'ENTITY_SPAWN'; player: NetPlayer }
  | { type: 'ENTITY_DESPAWN'; id: string }
  | { type: 'ERROR'; reason: string };

export function defaultServerUrl(): string {
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}

/** A joined room. The server owns membership and spawn points; the client only sends intent. */
export class NetworkSession {
  /** Other players in the room, keyed by id. */
  readonly players = new Map<string, NetPlayer>();
  readonly spawn: Vector2Like;

  private constructor(
    private readonly socket: WebSocket,
    readonly roomId: string,
    readonly playerId: string,
    players: NetPlayer[],
  ) {
    this.spawn = players.find((player) => player.id === playerId) ?? { x: 0, y: 0 };
    for (const player of players) if (player.id !== playerId) this.players.set(player.id, player);
    socket.addEventListener('message', (event) => this.receive(JSON.parse(event.data as string) as ServerMessage));
  }

  /** Opens a socket and joins `roomId`, or creates a room when it is null. */
  static connect(roomId: string | null, url = defaultServerUrl()): Promise<NetworkSession> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      const fail = (reason: string) => {
        detach();
        socket.close();
        reject(new Error(reason));
      };
      const onOpen = () => socket.send(JSON.stringify({ type: 'JOIN_ROOM', roomId }));
      const onClose = () => fail('connection_failed');
      const onMessage = (event: MessageEvent) => {
        const message = JSON.parse(event.data as string) as ServerMessage;
        if (message.type === 'ERROR') {
          fail(message.reason);
        } else if (message.type === 'ROOM_JOINED') {
          detach();
          resolve(new NetworkSession(socket, message.roomId, message.playerId, message.players));
        }
      };
      const detach = () => {
        socket.removeEventListener('open', onOpen);
        socket.removeEventListener('close', onClose);
        socket.removeEventListener('message', onMessage);
      };
      socket.addEventListener('open', onOpen);
      socket.addEventListener('close', onClose);
      socket.addEventListener('message', onMessage);
    });
  }

  get connected(): boolean {
    return this.socket.readyState === WebSocket.OPEN;
  }

  // ponytail: one message per rendered frame; batch to the server tick rate in M3/M6.
  sendInput(input: PlayerInput): void {
    if (this.connected) this.socket.send(JSON.stringify({ type: 'PLAYER_INPUT', input }));
  }

  private receive(message: ServerMessage): void {
    if (message.type === 'ENTITY_SPAWN') this.players.set(message.player.id, message.player);
    if (message.type === 'ENTITY_DESPAWN') this.players.delete(message.id);
  }
}
