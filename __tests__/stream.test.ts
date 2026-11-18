import { Readable } from 'node:stream';
import { text } from 'node:stream/consumers';
import { finished } from 'node:stream/promises';
import { setImmediate as tick } from 'node:timers/promises';
import { describe, expect, it } from 'vitest';
import { createTidyStream, tidy, type TidyOptions } from '../src/index.js';

function runStream(chunks: Buffer[], options?: TidyOptions): Promise<string> {
  return text(Readable.from(chunks).pipe(createTidyStream(options)));
}

function bytes(input: string): Buffer[] {
  return [...Buffer.from(input)].map((b) => Buffer.from([b]));
}

const eraseThreeLines = '\x1b[2K\x1b[1A\x1b[2K\x1b[1A\x1b[2K\x1b[G';
const RAW =
  '$ pnpm build\r\n' +
  '\x1b]0;build\x07\x1b[?25l' +
  '\x1b[33m⠋\x1b[39m build\n\x1b[33m⠋\x1b[39m test\n' +
  eraseThreeLines +
  '\x1b[32m✓\x1b[39m build\n\x1b[32m✓\x1b[39m test\n' +
  '\x1b[?25h' +
  'WARN dup\nWARN dup\nWARN dup\nWARN dup\n' +
  '\x1b[H\x1b[2J\x1b[3J' +
  'second run ✓\r\n';

describe('createTidyStream', () => {
  it('outputs nothing for empty input', async () => {
    expect(await runStream([])).toBe('');
  });

  it('matches tidy for a single chunk', async () => {
    expect(await runStream([Buffer.from(RAW)])).toBe(tidy(RAW));
  });

  it('matches tidy when fed byte by byte', async () => {
    expect(await runStream(bytes(RAW))).toBe(tidy(RAW));
  });

  it('matches tidy for every split into two chunks', async () => {
    const buf = Buffer.from(RAW);
    for (let i = 0; i <= buf.length; i++) {
      expect(await runStream([buf.subarray(0, i), buf.subarray(i)])).toBe(tidy(RAW));
    }
  });

  it('matches tidy with a small height and collapsing, byte by byte', async () => {
    const options: TidyOptions = { height: 3, collapseRepeats: true };
    expect(await runStream(bytes(RAW), options)).toBe(tidy(RAW, options));
  });

  it('decodes a multi-byte character split across chunks', async () => {
    const buf = Buffer.from('✓ ok');
    expect(await runStream([buf.subarray(0, 1), buf.subarray(1, 2), buf.subarray(2)])).toBe('✓ ok');
  });

  it('emits lines as soon as they scroll out of the viewport', async () => {
    const stream = createTidyStream({ height: 2 });
    const out: string[] = [];
    stream.on('data', (chunk) => out.push(String(chunk)));

    stream.write('a\nb\nc\n');
    await tick();
    expect(out.join('')).toBe('a\nb\n');

    stream.end('d');
    await finished(stream);
    expect(out.join('')).toBe('a\nb\nc\nd');
  });

  it('holds a repeated run until it ends', async () => {
    const stream = createTidyStream({ height: 1, collapseRepeats: true });
    const out: string[] = [];
    stream.on('data', (chunk) => out.push(String(chunk)));

    stream.write('w\nw\nw\n');
    await tick();
    expect(out.join('')).toBe('');

    stream.write('done\n');
    await tick();
    expect(out.join('')).toBe('w (×3)\n');

    stream.end();
    await finished(stream);
    expect(out.join('')).toBe('w (×3)\ndone');
  });

  it('rejects an invalid height', () => {
    expect(() => createTidyStream({ height: 0 })).toThrow(RangeError);
  });
});
