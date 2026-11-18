import { describe, expect, it } from 'vitest';
import { tidy } from '../src/index.js';

describe('tidy: performance', () => {
  // Quadratic row handling took ~20s here; linear takes well under a second.
  it('handles 200k lines in one call in linear time', () => {
    const input = 'line of text here\n'.repeat(200_000);
    const start = performance.now();
    const out = tidy(input);
    expect(performance.now() - start).toBeLessThan(2000);
    expect(out).toBe(input.slice(0, -1));
  });
});
