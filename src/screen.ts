const DEFAULT_HEIGHT = 100;
// Not a terminal width, just a guard so input like ESC[99999999C can't allocate huge lines.
const MAX_COL = 10_000;

export type ScreenOptions = {
  /** What `ESC[2J` does to earlier output: keep it above the new screen (default) or drop it. */
  clearScreen?: 'keep' | 'drop';
  /** Rows the cursor can reach; output above them is final. Default 100. */
  height?: number;
};

function isBlank(line: string[]): boolean {
  return line.join('').trim() === '';
}

// Holes (cells never written, or erased) at the end are dropped; printed spaces are kept.
function lineRender(line: string[]): string {
  let end = line.length;
  while (end > 0 && line[end - 1] === undefined) {
    end--;
  }
  return Array.from(line.slice(0, end), (c) => c ?? ' ').join('');
}

export class Screen {
  private lines: string[][] = [[]];
  private row = 0;
  private col = 0;
  private viewportTop = 0;
  private final: string[] = [];
  private readonly clearMode: 'keep' | 'drop';
  private readonly height: number;

  constructor(options: ScreenOptions = {}) {
    this.clearMode = options.clearScreen ?? 'keep';
    const height = options.height ?? DEFAULT_HEIGHT;
    if (height < 1 || !Number.isInteger(height)) {
      throw RangeError(`height must be a positive integer, got ${height}`);
    }
    this.height = height;
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
    this.row = Math.max(this.viewportTop, this.row - n);
  }

  cursorDown(n: number): void {
    this.row = Math.min(this.row + n, this.bottomRow());
    this.ensureRows();
  }

  cursorForward(n: number): void {
    this.col = Math.max(this.col, Math.min(this.col + n, MAX_COL));
  }

  cursorBack(n: number): void {
    this.col = Math.max(0, this.col - n);
  }

  /** 0-based column. */
  cursorToColumn(col: number): void {
    this.col = Math.min(col, MAX_COL);
  }

  /** 0-based row and column, relative to the top of the viewport. */
  cursorTo(row: number, col: number): void {
    this.row = Math.min(this.viewportTop + row, this.bottomRow());
    this.col = Math.min(col, MAX_COL);
    this.ensureRows();
  }

  eraseInLine(mode: number): void {
    switch (mode) {
      case 0:
        this.lines[this.row].length = this.col;
        break;
      case 1:
        for (let i = 0; i <= this.col; i++) {
          delete this.lines[this.row][i];
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
        for (let i = this.viewportTop; i < this.row; i++) {
          this.lines[i] = [];
        }
        this.eraseInLine(1);
        break;
      case 2:
        this.clear();
        break;
    }
  }

  takeFinalLines(): string[] {
    const final = this.final;
    this.final = [];
    return final;
  }

  render(): string {
    return this.renderLines().join('\n');
  }

  renderLines(): string[] {
    return this.lines.map(lineRender);
  }

  private clear(): void {
    const offset = this.row - this.viewportTop;
    if (this.clearMode === 'drop') {
      this.lines.length = this.viewportTop;
    } else {
      while (this.lines.length > this.viewportTop && isBlank(this.lines[this.lines.length - 1])) {
        this.lines.pop();
      }
      this.viewportTop = Math.max(this.viewportTop, this.lines.length);
    }
    this.row = this.viewportTop + offset;
    this.ensureRows();
  }

  // Cursor movement stops here, like a real terminal; only a line feed scrolls past it.
  private bottomRow(): number {
    return this.viewportTop + this.height - 1;
  }

  private ensureRows(): void {
    while (this.lines.length <= this.row) {
      this.lines.push([]);
    }
    this.viewportTop = Math.max(this.viewportTop, this.lines.length - this.height);
    if (this.viewportTop > 0) {
      const rows = this.lines.splice(0, this.viewportTop);
      rows.forEach((row) => {
        this.final.push(lineRender(row));
      });
      this.row -= rows.length;
      this.viewportTop = 0;
    }
  }
}
