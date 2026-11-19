import { countTokens } from 'gpt-tokenizer';
import { readdirSync, readFileSync } from 'node:fs';
import stripAnsi from 'strip-ansi';
import { tidy } from '../dist/index.js';

const dir = new URL('../fixtures/', import.meta.url);
const names = readdirSync(dir).filter((f) => f.endsWith('.txt') && !f.endsWith('.expected.txt'));

const percentSaved = (before, after) => `${Math.round((1 - after / before) * 100)}%`;

const rows = names.map((name) => {
  const raw = readFileSync(new URL(name, dir), 'utf8');
  return {
    fixture: name.replace('.txt', ''),
    raw: countTokens(raw),
    'strip-ansi': countTokens(stripAnsi(raw)),
    tidy: countTokens(tidy(raw)),
    collapsed: countTokens(tidy(raw, { collapseRepeats: true })),
  };
});

const total = (key) => rows.reduce((sum, row) => sum + row[key], 0);
rows.push({
  fixture: 'TOTAL',
  raw: total('raw'),
  'strip-ansi': total('strip-ansi'),
  tidy: total('tidy'),
  collapsed: total('collapsed'),
});

console.table(
  rows.map((row) => ({
    ...row,
    'saved (strip-ansi)': percentSaved(row.raw, row['strip-ansi']),
    'saved (tidy)': percentSaved(row.raw, row.tidy),
    'saved (collapsed)': percentSaved(row.raw, row.collapsed),
  })),
);
