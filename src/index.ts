import { Parser } from './parser.js';
import { Screen, type ScreenOptions } from './screen.js';
import { collapseRepeats } from './collapse.js';

export type TidyOptions = ScreenOptions & { collapseRepeats?: boolean };

export function tidy(input: string, options: TidyOptions = {}): string {
  const screen = new Screen(options);
  new Parser(screen).feed(input);
  const lines = screen.renderLines();

  if (options.collapseRepeats) {
    return collapseRepeats(lines).join('\n');
  }
  return lines.join('\n');
}
