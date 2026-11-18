import { StringDecoder } from 'node:string_decoder';
import { Transform } from 'node:stream';
import { Tidier, type TidyOptions } from './tidier.js';

export function createTidyStream(options: TidyOptions = {}): Transform {
  const tidier = new Tidier(options);
  const decoder = new StringDecoder('utf8');

  return new Transform({
    transform(chunk, _encoding, cb) {
      const out = tidier.write(decoder.write(chunk));
      if (out) {
        this.push(out);
      }
      cb();
    },
    flush(cb) {
      const out = tidier.write(decoder.end()) + tidier.end();
      if (out) {
        this.push(out);
      }
      cb();
    },
  });
}
