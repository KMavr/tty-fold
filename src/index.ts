const ESC = '\x1b';
const BEL = '\x07';
const CR = '\r';
const LF = '\n';
const CSI_START = '[';
const OSC_START = ']';
const ST_FINAL = '\\';

type State = 'text' | 'esc' | 'csi' | 'osc' | 'oscEsc';
type Screen = {
  lines: string[][];
  row: number;
  col: number;
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
  } else {
    screen.lines[screen.row][screen.col] = char;
    screen.col++;
  }
  return 'text';
}

function handleEsc(char: string): State {
  if (char === CSI_START) {
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

function handleCsi(char: string): State {
  return isFinalByte(char) ? 'text' : 'csi';
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

  for (const char of input) {
    switch (state) {
      case 'text':
        state = handleText(screen, char);
        break;
      case 'esc':
        state = handleEsc(char);
        break;
      case 'csi':
        state = handleCsi(char);
        break;
      case 'osc':
        state = handleOsc(char);
        break;
      case 'oscEsc':
        state = handleOscEsc(char);
        break;
    }
  }

  return screen.lines.map((line) => line.join('')).join('\n');
}
