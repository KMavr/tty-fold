import { describe, expect, it } from 'vitest';
import { tidy } from '../src/index.js';

describe('tidy: strip styling', () => {
  it('leaves plain text alone', () => {
    expect(tidy('')).toBe('');
    expect(tidy('hello world')).toBe('hello world');
  });

  it('strips basic colour codes', () => {
    expect(tidy('\x1b[31mred\x1b[0m')).toBe('red');
  });

  it('strips reset with no parameters', () => {
    expect(tidy('\x1b[1mbold\x1b[m')).toBe('bold');
  });

  it('strips combined, 256-colour and truecolor codes', () => {
    expect(tidy('\x1b[1;4;31mx\x1b[0m')).toBe('x');
    expect(tidy('\x1b[38;5;208mx\x1b[0m')).toBe('x');
    expect(tidy('\x1b[38;2;255;100;0mx\x1b[0m')).toBe('x');
  });

  it('strips cursor show/hide (private mode)', () => {
    expect(tidy('\x1b[?25lworking\x1b[?25h')).toBe('working');
  });

  it('strips OSC 8 hyperlinks, both terminators', () => {
    expect(tidy('\x1b]8;;https://x.dev\x1b\\link\x1b]8;;\x1b\\')).toBe('link');
    expect(tidy('\x1b]8;;https://x.dev\x07link\x1b]8;;\x07')).toBe('link');
  });

  it('strips OSC window title', () => {
    expect(tidy('\x1b]0;my title\x07done')).toBe('done');
  });

  it('keeps newlines, indentation and tabs', () => {
    expect(tidy('\x1b[32m✓\x1b[0m a\n\tb\n  c')).toBe('✓ a\n\tb\n  c');
  });

  it('does not touch bracket text without ESC', () => {
    expect(tidy('array[31m] and [0m')).toBe('array[31m] and [0m');
  });

  it('should handle double ESC', () => {
    expect(tidy('\x1b\x1b[31mx')).toBe('x');
  });

  it('keeps a styled stack trace intact', () => {
    const raw =
      '\x1b[31mError: boom\x1b[39m\n' +
      '\x1b[2m    at foo (/app/src/a.ts:10:5)\x1b[22m\n' +
      '\x1b[2m    at Object.<anonymous> (/app/src/b.ts:3:1)\x1b[22m';
    expect(tidy(raw)).toBe(
      'Error: boom\n' +
        '    at foo (/app/src/a.ts:10:5)\n' +
        '    at Object.<anonymous> (/app/src/b.ts:3:1)',
    );
  });
});

describe('tidy: single-line rewrites', () => {
  it('carriage return overwrites without erasing', () => {
    expect(tidy('abc\rX')).toBe('Xbc');
  });

  it('treats CRLF as a plain newline', () => {
    expect(tidy('a\r\nb\r\n')).toBe('a\nb\n');
  });

  it('ignores a trailing carriage return', () => {
    expect(tidy('abc\r')).toBe('abc');
  });

  it('keeps leftovers when a shorter frame does not erase', () => {
    expect(tidy('⠋ loading\r✓ ok')).toBe('✓ okading');
  });

  it('erases to end of line (EL 0, the default)', () => {
    expect(tidy('⠋ loading\r\x1b[K✓ ok')).toBe('✓ ok');
    expect(tidy('⠋ loading\r\x1b[0K✓ ok')).toBe('✓ ok');
  });

  it('erases from start of line through the cursor (EL 1)', () => {
    expect(tidy('abcdef\b\b\b\x1b[1K')).toBe('    ef');
  });

  it('erases the whole line without moving the cursor (EL 2)', () => {
    expect(tidy('abc\x1b[2Kx')).toBe('   x');
  });

  it('replays a spinner down to its final frame', () => {
    const raw =
      '\x1b[?25l' +
      '\x1b[36m⠋\x1b[39m Resolving dependencies' +
      '\r\x1b[2K\x1b[36m⠙\x1b[39m Fetching packages' +
      '\r\x1b[2K\x1b[36m⠹\x1b[39m Linking' +
      '\r\x1b[2K\x1b[32m✓\x1b[39m Installed\n' +
      '\x1b[?25hDone';
    expect(tidy(raw)).toBe('✓ Installed\nDone');
  });

  it('backspace moves left without erasing', () => {
    expect(tidy('abc\bX')).toBe('abX');
  });

  it('backspace stops at column 0', () => {
    expect(tidy('a\b\b\bX')).toBe('X');
  });

  it('trims trailing spaces but keeps leading and inner ones', () => {
    expect(tidy('done   \n  a  b  ')).toBe('done\n  a  b');
  });
});

describe('tidy: cursor movement', () => {
  it('cursor up (CUU) keeps the column', () => {
    expect(tidy('abc\ndef\x1b[1AX')).toBe('abcX\ndef');
  });

  it('cursor up moves 1 row when the parameter is missing or 0', () => {
    expect(tidy('a\nb\x1b[AX')).toBe('aX\nb');
    expect(tidy('a\nb\x1b[0AX')).toBe('aX\nb');
  });

  it('cursor up stops at the first row', () => {
    expect(tidy('a\x1b[5AX')).toBe('aX');
  });

  it('newline after cursor up reuses the existing row', () => {
    expect(tidy('line1\nline2\x1b[A\rL\nM')).toBe('Line1\nMine2');
  });

  it('cursor down (CUD) keeps the column and creates rows', () => {
    expect(tidy('a\x1b[2Bb')).toBe('a\n\n b');
    expect(tidy('a\x1b[Bb')).toBe('a\n b');
  });

  it('cursor forward (CUF) leaves blanks', () => {
    expect(tidy('a\x1b[3Cb')).toBe('a   b');
  });

  it('cursor back (CUB) moves left and stops at column 0', () => {
    expect(tidy('abc\x1b[2DX')).toBe('aXc');
    expect(tidy('abc\x1b[9DX')).toBe('Xbc');
  });

  it('cursor to column (CHA) is 1-based and defaults to column 1', () => {
    expect(tidy('abc\x1b[Gx')).toBe('xbc');
    expect(tidy('abc\x1b[2Gx')).toBe('axc');
  });

  it('erase in display (ED 0) clears from the cursor to the end of the screen', () => {
    expect(tidy('one\ntwo\nthree\x1b[2A\r\x1b[Jdone')).toBe('done');
  });

  it('replays a multi-line spinner (log-update style redraw)', () => {
    const eraseThreeLines = '\x1b[2K\x1b[1A\x1b[2K\x1b[1A\x1b[2K\x1b[G';
    const raw =
      '\x1b[?25l' +
      '\x1b[33m⠋\x1b[39m build\n\x1b[33m⠋\x1b[39m test\n' +
      eraseThreeLines +
      '\x1b[32m✓\x1b[39m build\n\x1b[33m⠙\x1b[39m test\n' +
      eraseThreeLines +
      '\x1b[32m✓\x1b[39m build\n\x1b[32m✓\x1b[39m test\n' +
      '\x1b[?25h';
    expect(tidy(raw)).toBe('✓ build\n✓ test\n');
  });

  it('cursor position (CUP) is 1-based row;col and defaults to the top-left', () => {
    expect(tidy('abc\ndef\x1b[1;2HX')).toBe('aXc\ndef');
    expect(tidy('abc\x1b[HX')).toBe('Xbc');
    expect(tidy('a\x1b[3;3HX')).toBe('a\n\n  X');
  });

  it('erase in display (ED 1) clears from the screen top through the cursor', () => {
    expect(tidy('one\ntwo\nthree\x1b[2D\x1b[1J')).toBe('\n\n    e');
  });

  it('keeps output above a multi-line redraw untouched', () => {
    const raw = '$ pnpm build\n' + 'a: 10%\nb: 10%\n' + '\x1b[2A\r\x1b[J' + 'a: done\nb: done\n';
    expect(tidy(raw)).toBe('$ pnpm build\na: done\nb: done\n');
  });
});

describe('tidy: clear screen (ED 2)', () => {
  const CLEAR = '\x1b[H\x1b[2J\x1b[3J';

  it('keeps earlier output by default and starts a fresh screen below it', () => {
    expect(tidy('run 1\n' + CLEAR + 'run 2\n')).toBe('run 1\nrun 2\n');
  });

  it('never lets the new screen overwrite the old one', () => {
    expect(tidy('aaaa\nbbbb\n' + CLEAR + 'x\n')).toBe('aaaa\nbbbb\nx\n');
  });

  it('does not add blank rows when clearing an empty screen', () => {
    expect(tidy(CLEAR + 'hi')).toBe('hi');
  });

  it('positions the cursor relative to the new screen', () => {
    expect(tidy('old\n' + CLEAR + 'a\nb\x1b[1;1HX')).toBe('old\nX\nb');
  });

  it('stops cursor up at the top of the new screen', () => {
    expect(tidy('old\n' + CLEAR + 'new\x1b[5AX')).toBe('old\nnewX');
  });

  it('drops earlier output with clearScreen: drop', () => {
    expect(tidy('run 1\n' + CLEAR + 'run 2\n', { clearScreen: 'drop' })).toBe('run 2\n');
  });
});
