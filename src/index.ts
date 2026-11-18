import { Tidier, type TidyOptions } from './tidier.js';

export type { TidyOptions };

export function tidy(input: string, options: TidyOptions = {}): string {
  const tidier = new Tidier(options);

  return tidier.write(input) + tidier.end();
}

export { createTidyStream } from './stream.js';
