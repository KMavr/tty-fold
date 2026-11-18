import { Parser } from './parser.js';
import { Screen, type ScreenOptions } from './screen.js';

export type TidyOptions = ScreenOptions;

export function tidy(input: string, options: TidyOptions = {}): string {
  const screen = new Screen(options);
  new Parser(screen).feed(input);
  return screen.render();
}
