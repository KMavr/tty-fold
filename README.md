# tty-fold

[![CI](https://github.com/KMavr/tty-fold/actions/workflows/ci.yml/badge.svg)](https://github.com/KMavr/tty-fold/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/tty-fold.svg)](https://www.npmjs.com/package/tty-fold)
[![npm downloads](https://img.shields.io/npm/dm/tty-fold.svg)](https://www.npmjs.com/package/tty-fold)
[![install size](https://packagephobia.com/badge?p=tty-fold)](https://packagephobia.com/result?p=tty-fold)
[![types](https://img.shields.io/npm/types/tty-fold.svg)](https://www.npmjs.com/package/tty-fold)
[![node](https://img.shields.io/node/v/tty-fold.svg)](https://www.npmjs.com/package/tty-fold)
[![license](https://img.shields.io/npm/l/tty-fold.svg)](LICENSE)

Turn raw terminal output into the text a human would have seen on screen.

Captured terminal output is full of things nobody reads: colour codes, spinner frames, progress bars redrawn hundreds of times, screens cleared and drawn again. `tty-fold` replays all of it on a virtual screen and returns only the final result. That makes logs readable, and it makes them much cheaper to hand to an LLM or coding agent.

- **Zero runtime dependencies.**
- **Exact.** Stack traces and diffs come through character for character. Nothing is guessed, summarised or truncated.
- **Streaming.** A Node `Transform` stream that gives the same output as the one-shot function, however the input is split up.

`pnpm add` in a terminal, 988 tokens raw:

```
Progress: resolved \e[96m53\e[39m, reused \e[96m0\e[39m, downloaded \e[96m1\e[39m, added \e[96m0\e[39m\e[0K\r
\e[0K\e[K\e[0J\r\e[1AProgress: resolved \e[96m53\e[39m, reused \e[96m0\e[39m, downloaded \e[96m51\e[39m, added \e[96m50\e[39m\r
…
\e[32m+\e[39m\e[32m+\e[39m\e[32m+\e[39m\e[32m+\e[39m\e[32m+\e[39m\e[32m+\e[39m\e[32m+\e[39m\e[32m+\e[39m…
```

After `tidy`, 161 tokens:

```
Packages: +53
+++++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 53, reused 0, downloaded 53, added 53, done

devDependencies:
+ typescript 5.9.3
+ vitest 3.2.4
```

## Install

```sh
npm install tty-fold
```

Requires Node 22 or later. ESM only.

## Usage

### `tidy(input, options?)`

```ts
import { tidy } from 'tty-fold';

tidy('\x1b[31mError:\x1b[0m boom'); // 'Error: boom'
tidy('⠋ loading\r\x1b[K✓ done'); // '✓ done'
tidy('warn\nwarn\nwarn\nok', { collapseRepeats: true }); // 'warn (×3)\nok'
```

### `createTidyStream(options?)`

A `Transform` stream that takes bytes and outputs tidy text. Lines are written as soon as they can no longer change, so long-running output flows through instead of being buffered to the end. Chunks may split escape sequences or multi-byte characters anywhere.

```ts
import { spawn } from 'node:child_process';
import { createTidyStream } from 'tty-fold';

const child = spawn('pnpm', ['install'], { env: { ...process.env, FORCE_COLOR: '1' } });
child.stdout.pipe(createTidyStream()).pipe(process.stdout);
```

## Options

| Option            | Default  | Description                                                                                                                                                                                                        |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `collapseRepeats` | `false`  | Collapse 3 or more identical consecutive lines into one line followed by `(×N)`. Only exact repeats, never blank lines. Off by default so diffs and other exact output stay as they are.                           |
| `clearScreen`     | `'keep'` | What a clear screen (`ESC[2J`) does to earlier output. `'keep'` keeps it and starts the new screen below, which preserves every run of a watch mode. `'drop'` discards what was on screen.                         |
| `height`          | `100`    | Rows the cursor can move back up into. Output above that is final. Final rows are stored as plain text, so memory stays close to the output size, and the stream can emit lines early. Must be a positive integer. |

## What it handles

- **Styling:** colours (16, 256 and truecolor), bold and other SGR attributes.
- **OSC sequences:** hyperlinks and window titles, ended by either BEL or ST.
- **Line rewrites:** carriage return, backspace, erase in line (`ESC[K`, modes 0–2).
- **Cursor movement:** up, down, forward, back, to a column (`ESC[G`) and to a position (`ESC[H`). Like a real terminal, the cursor stops at the bottom of the screen (`height` rows). Columns are capped at 10,000.
- **Erase in display:** `ESC[J`, modes 0–2. Mode 3 (clear scrollback) is ignored.
- **Private sequences** such as `ESC[?25l` (hide cursor) and `ESC[?2026h` (synchronized output) are removed.

What a human sees is what you get. Spaces the program printed are kept, and gaps the cursor skipped over are trimmed from line ends. Trailing blank lines are dropped.

## Not handled (yet)

- **The alternate screen** (`ESC[?1049h`), used by full-screen apps like `vim` or `less`.
- **Real tab stops.** Tabs are kept as `\t` characters.
- **Wide characters.** CJK and emoji count as one column, so cursor positioning across them can be off.

## Benchmark

Real captures from a pty, in [`fixtures/`](fixtures). Tokens are counted with [`gpt-tokenizer`](https://github.com/niieani/gpt-tokenizer). Other tokenizers give different absolute numbers but similar ratios.

| Capture                    | Raw  | tidy | Saved | + collapseRepeats |
| -------------------------- | ---- | ---- | ----- | ----------------- |
| `git diff --color`         | 376  | 186  | 51%   | 51%               |
| `pnpm add` (warm cache)    | 988  | 161  | 84%   | 84%               |
| Node stack overflow        | 133  | 89   | 33%   | 33%               |
| `tsc` with errors          | 464  | 191  | 59%   | 59%               |
| `tsc --watch`, 3 rebuilds  | 1152 | 490  | 57%   | 57%               |
| `vitest run` with failures | 2904 | 1280 | 56%   | 56%               |
| Retry loop, 25 equal lines | 473  | 239  | 49%   | 94%               |
| **Total**                  | 6490 | 2636 | 59%   | 63%               |

### Speed

Time grows linearly with input size. On an Apple Silicon laptop, `tidy` processes about 20–23 MB/s (200,000 lines in under 350 ms), whether the input is plain, coloured or full of spinner redraws.

Run it yourself with `pnpm bench`.

## License

[MIT](LICENSE)
