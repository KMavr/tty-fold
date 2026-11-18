import {
  BEL,
  BS,
  CHA,
  CR,
  CSI_START,
  CUB,
  CUD,
  CUF,
  CUP,
  CUU,
  ED,
  EL,
  ESC,
  FF,
  HT,
  LF,
  OSC_START,
  ST_FINAL,
  VT,
} from './constants.js';
import type { Screen } from './screen.js';

const HANDLED_FINALS = EL + ED + CUP + CUU + CUD + CUF + CUB + CHA;

// Private sequences start with one of `<=>?` (0x3c–0x3f), e.g. ESC[?25l.
function isPrivate(params: string): boolean {
  const code = params.charCodeAt(0);
  return code >= 0x3c && code <= 0x3f;
}

type State = 'text' | 'esc' | 'csi' | 'osc' | 'oscEsc';

function isFinalByte(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return code >= 0x40 && code <= 0x7e;
}

export class Parser {
  private state: State = 'text';
  private params = '';

  constructor(private readonly screen: Screen) {}

  feed(chunk: string): void {
    for (const char of chunk) {
      switch (this.state) {
        case 'text':
          this.state = this.handleText(char);
          break;
        case 'esc':
          this.state = this.handleEsc(char);
          break;
        case 'csi':
          this.state = this.handleCsi(char);
          break;
        case 'osc':
          this.state = this.handleOsc(char);
          break;
        case 'oscEsc':
          this.state = this.handleOscEsc(char);
          break;
      }
    }
  }

  private handleText(char: string): State {
    const code = char.charCodeAt(0);
    // Printable text is the common case, so check it before the controls (C0 and DEL).
    if (code >= 0x20 && code !== 0x7f) {
      this.screen.write(char);
      return 'text';
    }
    switch (char) {
      case ESC:
        return 'esc';
      case CR:
        this.screen.carriageReturn();
        break;
      case LF:
      case VT:
      case FF:
        this.screen.lineFeed();
        break;
      case BS:
        this.screen.backspace();
        break;
      case HT:
        this.screen.write(char);
        break;
      default:
        break;
    }
    return 'text';
  }

  private handleEsc(char: string): State {
    switch (char) {
      case CSI_START:
        this.params = '';
        return 'csi';
      case OSC_START:
        return 'osc';
      case ESC:
        return 'esc';
      default:
        return 'text';
    }
  }

  private handleCsi(char: string): State {
    if (!isFinalByte(char)) {
      this.params += char;
      return 'csi';
    }
    // Most CSI sequences are styling (SGR, `m`), so skip param parsing for anything not handled.
    if (HANDLED_FINALS.includes(char) && !isPrivate(this.params)) {
      this.runCsi(char);
    }
    return 'text';
  }

  // Translates the escape protocol (missing params, 1-based positions) into screen operations.
  private runCsi(final: string): void {
    const params = this.params.split(';').map(Number);
    const n = params[0];

    switch (final) {
      case EL:
        this.screen.eraseInLine(n);
        break;
      case ED:
        this.screen.eraseInDisplay(n);
        break;
      case CUP:
        this.screen.cursorTo((n || 1) - 1, (params[1] || 1) - 1);
        break;
      case CUU:
        this.screen.cursorUp(n || 1);
        break;
      case CUD:
        this.screen.cursorDown(n || 1);
        break;
      case CUF:
        this.screen.cursorForward(n || 1);
        break;
      case CUB:
        this.screen.cursorBack(n || 1);
        break;
      case CHA:
        this.screen.cursorToColumn((n || 1) - 1);
        break;
    }
  }

  private handleOsc(char: string): State {
    switch (char) {
      case BEL:
        return 'text';
      case ESC:
        return 'oscEsc';
      default:
        return 'osc';
    }
  }

  private handleOscEsc(char: string): State {
    return char === ST_FINAL ? 'text' : 'osc';
  }
}
