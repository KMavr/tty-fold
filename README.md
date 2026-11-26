# tty-fold

[![CI](https://github.com/KMavr/tty-fold/actions/workflows/ci.yml/badge.svg)](https://github.com/KMavr/tty-fold/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/tty-fold.svg)](https://www.npmjs.com/package/tty-fold)
[![npm downloads](https://img.shields.io/npm/dm/tty-fold.svg)](https://www.npmjs.com/package/tty-fold)
[![unpacked size](https://img.shields.io/npm/unpacked-size/tty-fold.svg)](https://www.npmjs.com/package/tty-fold)
[![types](https://img.shields.io/npm/types/tty-fold.svg)](https://www.npmjs.com/package/tty-fold)
[![node](https://img.shields.io/node/v/tty-fold.svg)](https://www.npmjs.com/package/tty-fold)
[![license](https://img.shields.io/npm/l/tty-fold.svg)](LICENSE)
![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-fe5196?logo=conventionalcommits&logoColor=white)

Turn raw terminal output into the text a human would have seen on screen.

Captured terminal output is full of things nobody reads: colour codes, spinner frames, progress bars redrawn hundreds of times, screens cleared and drawn again. `tty-fold` replays all of it on a virtual screen and returns only the final result. That makes logs readable, and it makes them much cheaper to hand to an LLM or coding agent.

- **The final screen, not every frame.** Spinners, progress bars and redraws come out as what was last on screen.
- **Zero runtime dependencies.**
- **Exact.** Stack traces and diffs come through character for character. Nothing is guessed, summarised or truncated.
- **Streaming.** A Node `Transform` stream that gives the same output as the one-shot function, however the input is split up.

![tty-fold demo](https://raw.githubusercontent.com/KMavr/tty-fold/main/assets/demo.gif)

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

### In an agent tool

Pass command output through `tidy` before returning it to the model:

```ts
import { tidy } from 'tty-fold';

async function runCommand(command: string): Promise<string> {
  const output = await runInPty(command); // your harness's way of running commands
  return tidy(output, { collapseRepeats: true });
}
```

You need this when the output still has terminal codes in it:

- **Commands run in a pseudo-terminal.** Many agent harnesses do this so tools behave as they would for a person, which brings colours, spinners and progress bars with them.
- **Captured logs.** CI logs, such as a failed GitHub Actions job, keep their colour codes and progress output.
- **Forced colour.** `FORCE_COLOR`, `--color` or tools that ignore `NO_COLOR`.

If your commands run without a TTY and print plain text, there is little to save.

[`examples/agent-tool.ts`](examples/agent-tool.ts) is a runnable version that prints what the model would read with and without `tidy`. Run `pnpm example`, or pass any command: `pnpm example "pnpm install"`.

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
- **Control characters** a terminal shows nothing for, such as NUL, a stray BEL or `^D`, are removed. Vertical tab and form feed start a new line.

What a human sees is what you get. Spaces the program printed are kept, and gaps the cursor skipped over are trimmed from line ends. Trailing blank lines are dropped.

## Not handled (yet)

- **The alternate screen** (`ESC[?1049h`), used by full-screen apps like `vim` or `less`.
- **Real tab stops.** Tabs are kept as `\t` characters.
- **Wide characters.** CJK and emoji count as one column, so cursor positioning across them can be off.

## How is this different from strip-ansi?

[`strip-ansi`](https://github.com/chalk/strip-ansi) removes styling, and for output that is only coloured it is the right tool: smaller and faster. `tty-fold` also replays what the codes do: carriage returns, cursor movement and screen clears. So spinners, progress bars and redraws come out as their final state instead of every frame.

A `curl` progress bar has no colour codes at all, so `strip-ansi` leaves all 71 frames in place. `tidy` returns the one line you saw at the end:

```
############################################################################################# 100.0%
```

A `docker build` redraws its whole step list several times a second. `strip-ansi` keeps all 57 redraws (26,676 tokens). `tidy` keeps the final list (773 tokens).

On output that is mostly colour, the two save about the same. The total below is dominated by the `docker build` capture. Without it, `strip-ansi` saves 57% and `tidy` 68%.

## Benchmark

Real captures from a pty, in [`fixtures/`](fixtures). Tokens are counted with [`gpt-tokenizer`](https://github.com/niieani/gpt-tokenizer). Other tokenizers give different absolute numbers but similar ratios.

| Capture                              | Raw       | strip-ansi      | tidy           | + collapseRepeats |
| ------------------------------------ | --------- | --------------- | -------------- | ----------------- |
| `docker build`, 6 steps              | 37365     | 26676 (29%)     | 773 (98%)      | 773 (98%)         |
| `curl` progress bar                  | 637       | 637 (0%)        | 8 (99%)        | 8 (99%)           |
| `pnpm add`, cold cache, 137 packages | 1955      | 420 (79%)       | 244 (88%)      | 244 (88%)         |
| `pnpm add`, warm cache               | 988       | 222 (78%)       | 161 (84%)      | 161 (84%)         |
| `git diff --color`                   | 376       | 188 (50%)       | 186 (51%)      | 186 (51%)         |
| Node stack overflow                  | 133       | 91 (32%)        | 89 (33%)       | 89 (33%)          |
| `tsc` with errors                    | 464       | 198 (57%)       | 191 (59%)      | 191 (59%)         |
| `tsc --watch`, 3 rebuilds            | 1152      | 501 (57%)       | 490 (57%)      | 490 (57%)         |
| `vitest run` with failures           | 2904      | 1370 (53%)      | 1280 (56%)     | 1280 (56%)        |
| Retry loop, 25 equal lines           | 473       | 240 (49%)       | 239 (49%)      | 27 (94%)          |
| **Total**                            | **46447** | **30543 (34%)** | **3661 (92%)** | **3449 (93%)**    |

### Speed

Time grows linearly with input size. On an Apple Silicon laptop, `tidy` processes about 20–25 MB/s (200,000 lines in about 300 ms or less), whether the input is plain, coloured or full of spinner redraws.

Run it yourself with `pnpm bench`.

## Related projects

- [`strip-ansi`](https://github.com/chalk/strip-ansi): removes styling only. The right choice when output is coloured but never redrawn.
- [`@xterm/headless`](https://github.com/xtermjs/xterm.js/tree/master/headless): a full terminal emulator (about 2 MB). Use it when you need everything a real terminal does, such as the alternate screen or wide characters.
- [`rtk`](https://github.com/rtk-ai/rtk): a ready-made CLI for coding agents that summarises the output of common commands. Use it if you want a drop-in tool for your agent rather than a library. It shortens output by summarising; `tty-fold` keeps exactly what was on screen.

## License

[MIT](LICENSE)
