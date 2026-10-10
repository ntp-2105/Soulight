import { describe, expect, it } from 'vitest';
import { generateDungeon, bfs, TILE } from '../src/gameplay/dungeon/DungeonGenerator';

describe('dungeon generator', () => {
  it('is deterministic per seed', () => {
    const a = generateDungeon(42), b = generateDungeon(42);
    expect(a.tiles).toEqual(b.tiles);
    expect(a.rooms.map((r) => r.templateId)).toEqual(b.rooms.map((r) => r.templateId));
  });

  it('builds valid, connected dungeons for many seeds', () => {
    for (let seed = 0; seed < 200; seed++) {
      const d = generateDungeon(seed);
      expect(bfs(d.rooms, d.startRoomId).every((x) => x >= 0)).toBe(true);
      expect(d.rooms.filter((r) => r.type === 'boss')).toHaveLength(1);
      const start = d.rooms[d.startRoomId]!;
      expect(start.playerSpawns.length).toBeGreaterThan(0);
      for (const r of d.rooms) for (const p of r.doorTiles) expect(d.tiles[p.y * d.width + p.x]).toBe(TILE.door);
    }
  });
});
