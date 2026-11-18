import { tidy } from '../dist/index.js';

const inputs = {
  'plain lines': 'line of text here\n',
  'coloured lines': '\x1b[32m✓\x1b[0m \x1b[1mtest\x1b[0m passed\n',
  'spinner redraws': '\r\x1b[K⠋ working\r\x1b[K⠙ working\r\x1b[K✓ done\n',
};

const rows = Object.entries(inputs).flatMap(([name, line]) =>
  [50_000, 200_000].map((n) => {
    const input = line.repeat(n);
    const start = performance.now();
    tidy(input);
    const ms = performance.now() - start;
    return {
      input: name,
      lines: n,
      ms: Math.round(ms),
      'MB/s': +(input.length / 1e6 / (ms / 1000)).toFixed(1),
    };
  }),
);

console.table(rows);
