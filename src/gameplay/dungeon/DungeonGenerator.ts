// Graph on a coarse grid, one room per cell, edges only between orthogonal neighbours
// so rooms never overlap and corridors are straight.
// Same seed + GEN_VERSION => same dungeon (SplitMix64 on BigInt, identical to the C# Rng).

export type RoomType = 'start' | 'combat' | 'reward' | 'shop' | 'boss';
export type Pt = { x: number; y: number };
export const TILE = { wall: 0, floor: 1, door: 2 } as const;

export const GEN_VERSION = 1;
export const GRID_SIZE = 7;
export const CELL_TILES = 24;
export const TILE_SIZE = 32;
const MAX_ATTEMPTS = 50;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const M64 = (1n << 64n) - 1n;

export class Rng {
  private state: bigint;
  constructor(seed: bigint) { this.state = seed & M64; }
  private nextU64(): bigint {
    this.state = (this.state + 0x9E3779B97F4A7C15n) & M64;
    let z = this.state;
    z = ((z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n) & M64;
    z = ((z ^ (z >> 27n)) * 0x94D049BB133111EBn) & M64;
    return z ^ (z >> 31n);
  }
  next(maxExclusive: number): number { return Number(this.nextU64() % BigInt(maxExclusive)); }
  range(min: number, maxInclusive: number): number { return min + this.next(maxInclusive - min + 1); }
  chance(p: number): boolean { return Number(this.nextU64() >> 40n) / 2 ** 24 < p; }
  pick<T>(items: readonly T[]): T { return items[this.next(items.length)]!; }
}

// Legend: '#' wall, '.' floor, 'E' enemy, 'L' loot, 'P' player, 'B' boss spawn.
interface Template { id: string; usableFor: RoomType[]; rows: string[] }
const TEMPLATES: Template[] = [
  { id: 'start_hall', usableFor: ['start'], rows: [
    '################', '#..............#', '#..............#', '#...P......P...#', '#..............#', '#......##......#',
    '#......##......#', '#..............#', '#...P......P...#', '#..............#', '#..............#', '################'] },
  { id: 'combat_pillars', usableFor: ['combat'], rows: [
    '####################', '#..................#', '#..E............E..#', '#..................#', '#....##......##....#',
    '#....##......##....#', '#..................#', '#........E.........#', '#..................#', '#..................#',
    '#....##......##....#', '#....##......##....#', '#..................#', '#..E............E..#', '#..................#',
    '####################'] },
  { id: 'combat_walls', usableFor: ['combat'], rows: [
    '##################', '#................#', '#.E............E.#', '#....########....#', '#................#',
    '#..##........##..#', '#................#', '#.......E........#', '#................#', '#..##........##..#',
    '#................#', '#....########....#', '#.E............E.#', '##################'] },
  { id: 'combat_arena', usableFor: ['combat'], rows: [
    '################', '#..............#', '#.E..........E.#', '#...#......#...#', '#..............#', '#......E.......#',
    '#..............#', '#.......E......#', '#...#......#...#', '#.E..........E.#', '#..............#', '################'] },
  { id: 'reward_vault', usableFor: ['reward'], rows: [
    '################', '#..............#', '#..............#', '#....#....#....#', '#..............#', '#.....L..L.....#',
    '#..............#', '#..............#', '#....#....#....#', '#..............#', '#..............#', '################'] },
  { id: 'shop_font', usableFor: ['shop'], rows: [
    '################', '#..............#', '#..##......##..#', '#..#........#..#', '#..............#', '#......L.......#',
    '#.......L......#', '#..............#', '#..#........#..#', '#..##......##..#', '#..............#', '################'] },
  { id: 'boss_throne', usableFor: ['boss'], rows: [
    '####################', '#..................#', '#.E..............E.#', '#..................#', '#...##........##...#',
    '#...##........##...#', '#..................#', '#.........B........#', '#..................#', '#..................#',
    '#...##........##...#', '#...##........##...#', '#..................#', '#.E..............E.#', '#..................#',
    '####################'] },
];

export interface Room {
  id: number; type: RoomType; neighbors: number[];
  cellX: number; cellY: number; depth: number; templateId: string;
  tileX: number; tileY: number; tileW: number; tileH: number; // tile rect incl. walls
  enemySpawns: Pt[]; lootSpawns: Pt[]; playerSpawns: Pt[]; bossSpawn?: Pt;
  doorTiles: Pt[];
}

export interface Dungeon {
  seed: number; rooms: Room[]; width: number; height: number;
  tiles: Uint8Array; // row-major, TILE.*
  startRoomId: number; bossRoomId: number;
}

export const tileCenter = (tx: number, ty: number): Pt => ({ x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE });

export function generateDungeon(seed: number): Dungeon {
  const rng = new Rng(BigInt(seed >>> 0) * 2654435761n + BigInt(GEN_VERSION));
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rooms = tryBuildGraph(rng);
    if (rooms && validate(rooms)) return build(seed, rooms, rng);
  }
  throw new Error(`Dungeon generation failed for seed ${seed}`);
}

function tryBuildGraph(rng: Rng): Room[] | null {
  const rooms: Room[] = [];
  const byCell = new Set<string>();
  const add = (cellX: number, cellY: number): Room => {
    const r: Room = {
      id: rooms.length, type: 'combat', neighbors: [], cellX, cellY, depth: 0, templateId: '',
      tileX: 0, tileY: 0, tileW: 0, tileH: 0, enemySpawns: [], lootSpawns: [], playerSpawns: [], doorTiles: [],
    };
    rooms.push(r);
    byCell.add(`${cellX},${cellY}`);
    return r;
  };
  const link = (a: Room, b: Room) => { a.neighbors.push(b.id); b.neighbors.push(a.id); };
  const freeAround = (r: Room): [number, number][] =>
    DIRS.map(([dx, dy]) => [r.cellX + dx, r.cellY + dy] as [number, number])
      .filter(([x, y]) => x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE && !byCell.has(`${x},${y}`));

  // Critical path: start -> ... -> boss.
  const start = add(GRID_SIZE >> 1, GRID_SIZE >> 1);
  start.type = 'start';
  const pathLength = rng.range(6, 7);
  const path = [start];
  let cur = start;
  while (path.length < pathLength) {
    const free = freeAround(cur);
    if (!free.length) return null;
    const [cx, cy] = rng.pick(free);
    const next = add(cx, cy);
    link(cur, next);
    path.push(next);
    cur = next;
  }
  cur.type = 'boss';

  // Optional branches off the middle of the path (never off start or boss).
  const branches = rng.range(1, 3);
  for (let b = 0; b < branches; b++) {
    let at = path[rng.range(1, path.length - 2)]!;
    const len = rng.range(1, 2);
    for (let i = 0; i < len; i++) {
      const free = freeAround(at);
      if (!free.length) break;
      const [cx, cy] = rng.pick(free);
      const n = add(cx, cy);
      link(at, n);
      at = n;
    }
  }

  // One reward (prefer a dead end), optional shop (prefer a dead end), rest combat.
  const candidates = rooms.filter((r) => r.type === 'combat');
  const deadEnds = (list: Room[]) => list.filter((r) => r.neighbors.length === 1);
  const pickPreferDeadEnd = (list: Room[]) => rng.pick(deadEnds(list).length ? deadEnds(list) : list);
  const reward = pickPreferDeadEnd(candidates);
  reward.type = 'reward';
  candidates.splice(candidates.indexOf(reward), 1);
  if (rng.chance(0.5) && candidates.length > 3) pickPreferDeadEnd(candidates).type = 'shop';
  return rooms;
}

const count = (rooms: Room[], t: RoomType) => rooms.filter((r) => r.type === t).length;

export function validate(rooms: Room[]): boolean {
  if (count(rooms, 'start') !== 1 || count(rooms, 'boss') !== 1) return false;
  if (count(rooms, 'combat') < 3 || count(rooms, 'reward') < 1 || count(rooms, 'shop') > 1) return false;
  const depth = bfs(rooms, rooms.find((r) => r.type === 'start')!.id);
  if (depth.some((d) => d < 0)) return false; // disconnected
  rooms.forEach((r) => (r.depth = depth[r.id]!));
  return true;
}

export function bfs(rooms: Room[], fromId: number): number[] {
  const depth = rooms.map(() => -1);
  const q = [fromId];
  depth[fromId] = 0;
  for (let i = 0; i < q.length; i++) {
    const id = q[i]!;
    for (const n of rooms[id]!.neighbors) {
      if (depth[n]! >= 0) continue;
      depth[n] = depth[id]! + 1;
      q.push(n);
    }
  }
  return depth;
}

function build(seed: number, rooms: Room[], rng: Rng): Dungeon {
  const size = GRID_SIZE * CELL_TILES;
  const tiles = new Uint8Array(size * size);
  const set = (x: number, y: number, v: number) => { tiles[y * size + x] = v; };

  for (const room of rooms) {
    const tpl = rng.pick(TEMPLATES.filter((t) => t.usableFor.includes(room.type)));
    room.templateId = tpl.id;
    room.tileW = tpl.rows[0]!.length;
    room.tileH = tpl.rows.length;
    room.tileX = room.cellX * CELL_TILES + ((CELL_TILES - room.tileW) >> 1);
    room.tileY = room.cellY * CELL_TILES + ((CELL_TILES - room.tileH) >> 1);
    tpl.rows.forEach((row, y) => [...row].forEach((c, x) => {
      if (c === '#') return;
      const tx = room.tileX + x, ty = room.tileY + y;
      set(tx, ty, TILE.floor);
      const world = tileCenter(tx, ty);
      if (c === 'E') room.enemySpawns.push(world);
      else if (c === 'L') room.lootSpawns.push(world);
      else if (c === 'P') room.playerSpawns.push(world);
      else if (c === 'B') room.bossSpawn = world;
    }));
  }

  // Corridors: 3 tiles wide on the cell's centre line, which every template's interior covers.
  const mid = (cell: number) => cell * CELL_TILES + (CELL_TILES >> 1);
  for (const a of rooms) for (const nId of a.neighbors) {
    if (nId < a.id) continue; // each edge once
    const b = rooms[nId]!;
    const horizontal = a.cellX !== b.cellX;
    const [lo, hi] = (horizontal ? a.cellX < b.cellX : a.cellY < b.cellY) ? [a, b] : [b, a];
    for (let o = -1; o <= 1; o++) {
      // d1/d2 = door tile on lo's far edge / hi's near edge, along the corridor axis
      const d1 = horizontal ? lo.tileX + lo.tileW - 1 : lo.tileY + lo.tileH - 1;
      const d2 = horizontal ? hi.tileX : hi.tileY;
      const across = (horizontal ? mid(lo.cellY) : mid(lo.cellX)) + o;
      const at = (along: number): Pt => (horizontal ? { x: along, y: across } : { x: across, y: along });
      for (const [room, d] of [[lo, d1], [hi, d2]] as const) {
        const p = at(d);
        set(p.x, p.y, TILE.door);
        room.doorTiles.push(p);
      }
      for (let i = d1 + 1; i < d2; i++) { const p = at(i); set(p.x, p.y, TILE.floor); }
    }
  }

  return {
    seed, rooms, width: size, height: size, tiles,
    startRoomId: rooms.find((r) => r.type === 'start')!.id,
    bossRoomId: rooms.find((r) => r.type === 'boss')!.id,
  };
}
