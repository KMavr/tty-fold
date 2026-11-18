import { Screen, type ScreenOptions } from './screen.js';
import { Parser } from './parser.js';
import { RepeatCollapser } from './collapse.js';

export type TidyOptions = ScreenOptions & { collapseRepeats?: boolean };

export class Tidier {
  private screen: Screen;
  private parser: Parser;
  private collapser?: RepeatCollapser;

  constructor(options: TidyOptions) {
    this.screen = new Screen(options);
    this.parser = new Parser(this.screen);
    if (options.collapseRepeats) {
      this.collapser = new RepeatCollapser();
    }
  }

  write(text: string): string {
    this.parser.feed(text);
    return this.collapse(this.screen.takeFinalLines())
      .map((line) => line + '\n')
      .join('');
  }

  end(): string {
    const lines = [...this.screen.takeFinalLines(), ...this.screen.renderLines()];
    if (!this.collapser) {
      return lines.join('\n');
    }
    const pushed = this.collapse(lines).map((line) => line + '\n');
    return pushed.join('') + this.collapser.flush().join('\n');
  }

  private collapse(lines: string[]): string[] {
    const collapser = this.collapser;
    return collapser ? lines.flatMap((line) => collapser.push(line)) : lines;
  }
}
