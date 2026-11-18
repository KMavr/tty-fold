import { describe, expect, it } from 'vitest';
import { Parser } from '../src/parser.js';
import { Screen } from '../src/screen.js';

function feedAll(chunks: string[]): string {
  const screen = new Screen();
  const parser = new Parser(screen);
  for (const chunk of chunks) {
    parser.feed(chunk);
  }
  return screen.render();
}

describe('Parser: state survives across chunks', () => {
  it('splits right after ESC', () => {
    expect(feedAll(['\x1b', '[31mred'])).toBe('red');
  });

  it('splits inside CSI parameters', () => {
    expect(feedAll(['\x1b[3', '1mred'])).toBe('red');
    expect(feedAll(['ab\x1b[1;', '2HX'])).toBe('aX');
  });

  it('splits inside an OSC and inside its ST terminator', () => {
    expect(feedAll(['\x1b]8;;https://x', '.dev\x1b', '\\link'])).toBe('link');
  });

  it('splits between CR and LF', () => {
    expect(feedAll(['a\r', '\nb'])).toBe('a\nb');
  });

  it('ignores empty chunks', () => {
    expect(feedAll(['', 'a', '', 'b', ''])).toBe('ab');
  });

  it('gives the same result char by char as in one go', () => {
    const eraseThreeLines = '\x1b[2K\x1b[1A\x1b[2K\x1b[1A\x1b[2K\x1b[G';
    const raw =
      '$ build\n' +
      '\x1b[?25l\x1b[33m*\x1b[39m build\n\x1b[33m*\x1b[39m test\n' +
      eraseThreeLines +
      '\x1b[32mok\x1b[39m build\n\x1b[32mok\x1b[39m test\n' +
      '\x1b[?25h\x1b]0;done\x07' +
      '\x1b[H\x1b[2J\x1b[3Jsecond run\r\n';
    expect(feedAll(raw.split(''))).toBe(feedAll([raw]));
  });
});

describe('Screen', () => {
  it('renders an empty screen as an empty string', () => {
    expect(new Screen().render()).toBe('');
  });

  it('takes the clearScreen option', () => {
    const screen = new Screen({ clearScreen: 'drop' });
    new Parser(screen).feed('old\n\x1b[H\x1b[2Jnew');
    expect(screen.render()).toBe('new');
  });
});
