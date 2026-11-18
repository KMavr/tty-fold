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
  LF,
  OSC_START,
  ST_FINAL,
} from './constants.js';
import type { Screen } from './screen.js';

const PRIVATE_MARKER = /^[<=>?]/;

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
    switch (char) {
      case ESC:
        return 'esc';
      case CR:
        this.screen.carriageReturn();
        break;
      case LF:
        this.screen.lineFeed();
        break;
      case BS:
        this.screen.backspace();
        break;
      default:
        this.screen.write(char);
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
    if (!PRIVATE_MARKER.test(this.params)) {
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
