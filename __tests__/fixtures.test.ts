import { readdirSync, readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { text } from 'node:stream/consumers';
import { describe, expect, it } from 'vitest';
import { createTidyStream, tidy } from '../src/index.js';

const dir = new URL('../fixtures/', import.meta.url);
const names = readdirSync(dir)
  .filter((f) => f.endsWith('.txt') && !f.endsWith('.expected.txt'))
  .map((f) => f.replace('.txt', ''));

const read = (file: string) => readFileSync(new URL(file, dir));

describe('fixtures: real terminal captures', () => {
  it('has fixtures', () => {
    expect(names.length).toBeGreaterThan(0);
  });

  describe.each(names)('%s', (name) => {
    const raw = read(`${name}.txt`);
    const expected = read(`${name}.expected.txt`).toString('utf8');

    it('tidy matches the expected output', () => {
      expect(tidy(raw.toString('utf8'))).toBe(expected);
    });

    it('the stream fed byte by byte matches it too', async () => {
      const chunks = [...raw].map((b) => Buffer.from([b]));
      expect(await text(Readable.from(chunks).pipe(createTidyStream()))).toBe(expected);
    });
  });

  it('collapses the retry loop', () => {
    const raw = read('wait-retry.txt').toString('utf8');
    expect(tidy(raw, { collapseRepeats: true })).toBe(
      'Starting dev server...\n' +
        'waiting for postgres at localhost:5432... (×25)\n' +
        'error: postgres did not start after 25 attempts',
    );
  });
});
