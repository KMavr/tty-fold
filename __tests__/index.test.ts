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
