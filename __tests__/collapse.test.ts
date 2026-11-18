import { describe, expect, it } from 'vitest';
import { collapseRepeats, RepeatCollapser } from '../src/collapse.js';
import { tidy } from '../src/index.js';

describe('collapseRepeats', () => {
  it('returns an empty list unchanged', () => {
    expect(collapseRepeats([])).toEqual([]);
  });

  it('leaves lines without repeats alone', () => {
    expect(collapseRepeats(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('collapses 3 or more identical consecutive lines', () => {
    expect(collapseRepeats(['x', 'x', 'x'])).toEqual(['x (×3)']);
    expect(collapseRepeats(['x', 'x', 'x', 'x', 'x'])).toEqual(['x (×5)']);
  });

  it('keeps runs of 2', () => {
    expect(collapseRepeats(['x', 'x', 'y'])).toEqual(['x', 'x', 'y']);
  });

  it('collapses separate runs independently', () => {
    expect(collapseRepeats(['a', 'a', 'a', 'b', 'a', 'a', 'a'])).toEqual(['a (×3)', 'b', 'a (×3)']);
  });

  it('does not collapse repeats that are not consecutive', () => {
    const lines = ['a', 'b', 'a', 'b', 'a', 'b'];
    expect(collapseRepeats(lines)).toEqual(lines);
  });

  it('only collapses exact matches', () => {
    const lines = ['x', '  x', 'X', 'x'];
    expect(collapseRepeats(lines)).toEqual(lines);
  });

  it('leaves blank lines alone', () => {
    expect(collapseRepeats(['a', '', '', '', '', 'b'])).toEqual(['a', '', '', '', '', 'b']);
  });

  it('does not change its input', () => {
    const lines = ['x', 'x', 'x'];
    collapseRepeats(lines);
    expect(lines).toEqual(['x', 'x', 'x']);
  });
});

describe('tidy: collapseRepeats option', () => {
  const warnings = 'WARN deprecated foo\nWARN deprecated foo\nWARN deprecated foo\ndone';

  it('is off by default', () => {
    expect(tidy(warnings)).toBe(warnings);
  });

  it('collapses when enabled', () => {
    expect(tidy(warnings, { collapseRepeats: true })).toBe('WARN deprecated foo (×3)\ndone');
  });

  it('drops the trailing newline', () => {
    expect(tidy('w\nw\nw\n', { collapseRepeats: true })).toBe('w (×3)');
  });

  it('collapses after replay, so rewritten frames are not repeats', () => {
    expect(tidy('loading\rloading\rloading\ndone', { collapseRepeats: true })).toBe(
      'loading\ndone',
    );
  });

  it('collapses styled lines that render identically', () => {
    const raw = '\x1b[33mwarn\x1b[39m\n\x1b[1;33mwarn\x1b[0m\nwarn\n';
    expect(tidy(raw, { collapseRepeats: true })).toBe('warn (×3)');
  });

  it('collapses repeated frames of a deep recursion stack trace', () => {
    const frame = '    at recurse (/app/src/a.ts:3:10)';
    const raw = ['RangeError: Maximum call stack size exceeded', ...Array(50).fill(frame)].join(
      '\n',
    );
    expect(tidy(raw, { collapseRepeats: true })).toBe(
      'RangeError: Maximum call stack size exceeded\n' + frame + ' (×50)',
    );
  });
});

describe('RepeatCollapser (streaming)', () => {
  it('holds a line until the next one shows it is not a run', () => {
    const c = new RepeatCollapser();
    expect(c.push('a')).toEqual([]);
    expect(c.push('b')).toEqual(['a']);
    expect(c.flush()).toEqual(['b']);
  });

  it('emits a collapsed run when a different line arrives', () => {
    const c = new RepeatCollapser();
    for (let i = 0; i < 4; i++) {
      expect(c.push('x')).toEqual([]);
    }
    expect(c.push('y')).toEqual(['x (×4)']);
    expect(c.flush()).toEqual(['y']);
  });

  it('emits short runs unchanged', () => {
    const c = new RepeatCollapser();
    c.push('x');
    c.push('x');
    expect(c.push('y')).toEqual(['x', 'x']);
  });

  it('passes blank runs through unchanged', () => {
    const c = new RepeatCollapser();
    c.push('');
    c.push('');
    c.push('');
    expect(c.push('a')).toEqual(['', '', '']);
  });

  it('flushes nothing when empty, and nothing twice', () => {
    const c = new RepeatCollapser();
    expect(c.flush()).toEqual([]);
    c.push('a');
    expect(c.flush()).toEqual(['a']);
    expect(c.flush()).toEqual([]);
  });
});
