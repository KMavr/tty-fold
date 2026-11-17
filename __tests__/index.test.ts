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
