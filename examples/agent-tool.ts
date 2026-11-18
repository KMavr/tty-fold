// A `run_command` tool for an AI agent: runs a shell command and returns what the model will read.
//
//   pnpm example                         replays a real `pnpm add` capture
//   pnpm example "pnpm install"          runs any command in a pseudo-terminal
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { countTokens } from 'gpt-tokenizer';
import { tidy } from '../dist/index.js';

// Agent harnesses often run commands in a pty so tools behave as they would for a person,
// which brings colours, spinners and progress bars with them. `script` provides one without
// a native dependency (macOS and Linux).
function runInPty(command: string): Promise<string> {
  const args =
    process.platform === 'darwin'
      ? ['-q', '/dev/null', 'sh', '-c', command]
      : ['-qec', command, '/dev/null'];

  return new Promise((resolve, reject) => {
    const child = spawn('script', args, { stdio: ['ignore', 'pipe', 'inherit'] });
    let output = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => (output += chunk));
    child.on('error', reject);
    child.on('close', () => resolve(output));
  });
}

// What the tool returns to the model. This one line is the whole integration.
async function runCommandTool(command: string): Promise<string> {
  return tidy(await runInPty(command), { collapseRepeats: true });
}

const command = process.argv.slice(2).join(' ') || 'cat fixtures/pnpm-install.txt';
const raw = await runInPty(command);
const tidied = await runCommandTool(command);

const visible = (text: string) => text.replaceAll('\x1b', '\\e').replaceAll('\r', '\\r');
const rawTokens = countTokens(raw);
const tidyTokens = countTokens(tidied);

console.log(`\n── Without tty-fold: the model reads (${rawTokens} tokens) ──\n`);
console.log(visible(raw));
// Set by assets/demo.tape so the GIF shows the two outputs one after the other.
await sleep(Number(process.env.DEMO_PAUSE_MS) || 0);
console.log(`\n── With tty-fold: the model reads (${tidyTokens} tokens) ──\n`);
console.log(tidied);
console.log(`\n${Math.round((1 - tidyTokens / rawTokens) * 100)}% fewer tokens for: ${command}`);
