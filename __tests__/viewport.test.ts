import { describe, expect, it } from 'vitest';
import { tidy } from '../src/index.js';
import { Parser } from '../src/parser.js';
import { Screen } from '../src/screen.js';

const CLEAR = '\x1b[H\x1b[2J\x1b[3J';

describe('tidy: height (viewport)', () => {
  it('stops cursor up at the top of the viewport', () => {
    expect(tidy('a\nb\nc\x1b[5AX', { height: 2 })).toBe('a\nbX\nc');
  });

  it('positions the cursor relative to the viewport', () => {
    expect(tidy('a\nb\nc\x1b[HX', { height: 2 })).toBe('a\nX\nc');
  });

  it('defaults to 100 rows', () => {
    const rows = Array.from({ length: 150 }, (_, i) => `r${i}`);
    const expected = rows.map((r, i) => (i === 50 ? r + 'X' : r)).join('\n');
    expect(tidy(rows.join('\n') + '\x1b[200A\x1b[4GX')).toBe(expected);
  });

  it('never lets the viewport move back up', () => {
    expect(tidy('a\nb\nc\nd\x1b[A\x1b[J\x1b[5AX', { height: 2 })).toBe('a\nb\ncX');
  });

  it('keeps rows that scrolled out when clearing with drop', () => {
    expect(tidy('a\nb\nc\n' + CLEAR + 'new', { height: 2, clearScreen: 'drop' })).toBe('a\nb\nnew');
  });

  it('keeps everything when clearing with keep', () => {
    expect(tidy('a\nb\nc\n' + CLEAR + 'new', { height: 2 })).toBe('a\nb\nc\nnew');
  });

  it('rejects a height that is not a positive integer', () => {
    for (const height of [0, -1, 1.5, NaN]) {
      expect(() => tidy('x', { height })).toThrow(RangeError);
    }
  });
});

describe('Screen.takeFinalLines', () => {
  function feed(input: string, height: number): Screen {
    const screen = new Screen({ height });
    new Parser(screen).feed(input);
    return screen;
  }

  it('returns nothing while every row is still reachable', () => {
    expect(feed('a\nb', 2).takeFinalLines()).toEqual([]);
  });

  it('returns rows that scrolled out, once', () => {
    const screen = feed('a\nb\nc\n', 2);
    expect(screen.takeFinalLines()).toEqual(['a', 'b']);
    expect(screen.takeFinalLines()).toEqual([]);
  });

  it('returns rendered lines (styling stripped, trailing holes dropped)', () => {
    expect(feed('\x1b[31mx\x1b[0m\x1b[3C\ny\nz', 1).takeFinalLines()).toEqual(['x', 'y']);
  });

  it('leaves the rest for render()', () => {
    const input = 'a\nb\nc\n';
    const screen = feed(input, 2);
    const taken = screen.takeFinalLines();
    expect(taken).toEqual(['a', 'b']);
    expect(screen.render()).toBe('c\n');
  });
});
