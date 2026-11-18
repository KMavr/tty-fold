export type ScreenOptions = {
  /** What `ESC[2J` does to earlier output: keep it above the new screen (default) or drop it. */
  clearScreen?: 'keep' | 'drop';
};

function isBlank(line: string[]): boolean {
  return line.join('').trim() === '';
}

export class Screen {
  private lines: string[][] = [[]];
  private row = 0;
  private col = 0;
  private top = 0;
  private readonly clearMode: 'keep' | 'drop';

  constructor(options: ScreenOptions = {}) {
    this.clearMode = options.clearScreen ?? 'keep';
  }

  write(char: string): void {
    this.lines[this.row][this.col] = char;
    this.col++;
  }

  carriageReturn(): void {
    this.col = 0;
  }

  lineFeed(): void {
    this.row++;
    this.col = 0;
    this.ensureRows();
  }

  backspace(): void {
    this.cursorBack(1);
  }

  cursorUp(n: number): void {
    this.row = Math.max(this.top, this.row - n);
  }

  cursorDown(n: number): void {
    this.row += n;
    this.ensureRows();
  }

  cursorForward(n: number): void {
    this.col += n;
  }

  cursorBack(n: number): void {
    this.col = Math.max(0, this.col - n);
  }

  /** 0-based column. */
  cursorToColumn(col: number): void {
    this.col = col;
  }

  /** 0-based row and column, relative to the top of the current screen. */
  cursorTo(row: number, col: number): void {
    this.row = this.top + row;
    this.col = col;
    this.ensureRows();
  }

  eraseInLine(mode: number): void {
    switch (mode) {
      case 0:
        this.lines[this.row].length = this.col;
        break;
      case 1:
        for (let i = 0; i <= this.col; i++) {
          this.lines[this.row][i] = ' ';
        }
        break;
      case 2:
        this.lines[this.row] = [];
        break;
    }
  }

  eraseInDisplay(mode: number): void {
    switch (mode) {
      case 0:
        this.eraseInLine(0);
        this.lines.length = this.row + 1;
        break;
      case 1:
        for (let i = this.top; i < this.row; i++) {
          this.lines[i] = [];
        }
        this.eraseInLine(1);
        break;
      case 2:
        this.clear();
        break;
    }
  }

  render(): string {
    return this.lines
      .map((line) =>
        Array.from(line, (c) => c ?? ' ')
          .join('')
          .trimEnd(),
      )
      .join('\n');
  }

  private clear(): void {
    const offset = this.row - this.top;
    if (this.clearMode === 'drop') {
      this.lines = [];
      this.top = 0;
    } else {
      while (this.lines.length > 0 && isBlank(this.lines[this.lines.length - 1])) {
        this.lines.pop();
      }
      this.top = this.lines.length;
    }
    this.row = this.top + offset;
    this.ensureRows();
  }

  private ensureRows(): void {
    for (let i = 0; i <= this.row; i++) {
      this.lines[i] ??= [];
    }
  }
}
