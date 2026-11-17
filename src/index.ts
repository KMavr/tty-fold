const ESC = '\x1b';
const BEL = '\x07';
const CR = '\r';
const LF = '\n';
const BS = '\b';
const EL = 'K';
const CSI_START = '[';
const OSC_START = ']';
const ST_FINAL = '\\';

type State = 'text' | 'esc' | 'csi' | 'osc' | 'oscEsc';
type Screen = {
  lines: string[][];
  row: number;
  col: number;
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

function handleCsi(screen: Screen, char: string, csi: Csi): State {
  if (!isFinalByte(char)) {
    csi.params += char;
    return 'csi';
  }
  if (char === EL) {
    eraseInLine(screen, Number(csi.params));
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

export function tidy(input: string): string {
  const screen: Screen = { lines: [[]], row: 0, col: 0 };
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
