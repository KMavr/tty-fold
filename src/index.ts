const ESC = '\x1b';
const BEL = '\x07';
const CR = '\r';
const LF = '\n';
const BS = '\b';
const CUU = 'A';
const CUD = 'B';
const CUF = 'C';
const CUB = 'D';
const CHA = 'G';
const CUP = 'H';
const ED = 'J';
const EL = 'K';
const CSI_START = '[';
const OSC_START = ']';
const ST_FINAL = '\\';

export type TidyOptions = {
  /** What `ESC[2J` does to earlier output: keep it above the new screen (default) or drop it. */
  clearScreen?: 'keep' | 'drop';
};

type State = 'text' | 'esc' | 'csi' | 'osc' | 'oscEsc';
type Screen = {
  lines: string[][];
  row: number;
  col: number;
  top: number;
  clearScreen: 'keep' | 'drop';
};
type Csi = {
  params: string;
};

function isFinalByte(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return code >= 0x40 && code <= 0x7e;
}

function handleText(screen: Screen, char: string): State {
  if (char === ESC) {
    return 'esc';
  }
  if (char === CR) {
    screen.col = 0;
  } else if (char === LF) {
    screen.row++;
    screen.col = 0;
    screen.lines[screen.row] ??= [];
  } else if (char === BS) {
    screen.col = Math.max(screen.col - 1, 0);
  } else {
    screen.lines[screen.row][screen.col] = char;
    screen.col++;
  }
  return 'text';
}

function handleEsc(char: string, csi: Csi): State {
  if (char === CSI_START) {
    csi.params = '';
    return 'csi';
  }
  if (char === OSC_START) {
    return 'osc';
  }
  if (char === ESC) {
    return 'esc';
  }
  return 'text';
}

function eraseInLine(screen: Screen, mode: number): void {
  switch (mode) {
    case 0:
      screen.lines[screen.row].length = screen.col;
      break;
    case 1:
      for (let i = 0; i <= screen.col; i++) {
        screen.lines[screen.row][i] = ' ';
      }
      break;
    case 2:
      screen.lines[screen.row] = [];
      break;
  }
}

function ensureRows(screen: Screen): void {
  for (let i = 0; i <= screen.row; i++) {
    screen.lines[i] ??= [];
  }
}

function isBlank(line: string[]): boolean {
  return line.join('').trim() === '';
}

function clearScreen(screen: Screen): void {
  const offset = screen.row - screen.top;
  if (screen.clearScreen === 'drop') {
    screen.lines = [];
    screen.top = 0;
  } else {
    while (screen.lines.length > 0 && isBlank(screen.lines[screen.lines.length - 1])) {
      screen.lines.pop();
    }
    screen.top = screen.lines.length;
  }
  screen.row = screen.top + offset;
  ensureRows(screen);
}

function eraseInDisplay(screen: Screen, mode: number): void {
  switch (mode) {
    case 0:
      eraseInLine(screen, 0);
      screen.lines.length = screen.row + 1;
      break;
    case 1:
      for (let i = screen.top; i < screen.row; i++) {
        screen.lines[i] = [];
      }
      eraseInLine(screen, 1);
      break;
    case 2:
      clearScreen(screen);
      break;
  }
}

function handleCsi(screen: Screen, char: string, csi: Csi): State {
  if (!isFinalByte(char)) {
    csi.params += char;
    return 'csi';
  }

  const params = csi.params.split(';').map(Number);
  const n = params[0];

  switch (char) {
    case EL:
      eraseInLine(screen, n);
      break;
    case ED:
      eraseInDisplay(screen, n);
      break;
    case CUP:
      screen.row = screen.top + (n || 1) - 1;
      screen.col = (params[1] || 1) - 1;
      ensureRows(screen);
      break;
    case CUU:
      screen.row = Math.max(screen.top, screen.row - (n || 1));
      break;
    case CUD:
      screen.row += n || 1;
      ensureRows(screen);
      break;
    case CUF:
      screen.col += n || 1;
      break;
    case CUB:
      screen.col = Math.max(0, screen.col - (n || 1));
      break;
    case CHA:
      screen.col = (n || 1) - 1;
      break;
  }

  return 'text';
}

function handleOsc(char: string): State {
  if (char === BEL) {
    return 'text';
  }
  if (char === ESC) {
    return 'oscEsc';
  }
  return 'osc';
}

function handleOscEsc(char: string): State {
  return char === ST_FINAL ? 'text' : 'osc';
}

export function tidy(input: string, options: TidyOptions = {}): string {
  const screen: Screen = {
    lines: [[]],
    row: 0,
    col: 0,
    top: 0,
    clearScreen: options.clearScreen ?? 'keep',
  };
  let state: State = 'text';
  const csi: Csi = { params: '' };

  for (const char of input) {
    switch (state) {
      case 'text':
        state = handleText(screen, char);
        break;
      case 'esc':
        state = handleEsc(char, csi);
        break;
      case 'csi':
        state = handleCsi(screen, char, csi);
        break;
      case 'osc':
        state = handleOsc(char);
        break;
      case 'oscEsc':
        state = handleOscEsc(char);
        break;
    }
  }

  return screen.lines
    .map((line) =>
      Array.from(line, (c) => c ?? ' ')
        .join('')
        .trimEnd(),
    )
    .join('\n');
}
