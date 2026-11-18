const MIN_RUN = 3;

export function collapseRepeats(lines: string[]): string[] {
  const repeatCollapser = new RepeatCollapser();
  const result: string[] = lines.flatMap((line) => repeatCollapser.push(line));
  result.push(...repeatCollapser.flush());
  return result;
}

export class RepeatCollapser {
  private current: string = '';
  private count: number = 0;

  private emitRun(): string[] {
    const isBlank = this.current === '';
    if (this.count < MIN_RUN || isBlank) {
      const result: string[] = [];
      for (let j = 0; j < this.count; j++) {
        result.push(this.current);
      }
      return result;
    }
    return [`${this.current} (×${this.count})`];
  }

  push(line: string): string[] {
    if (line === this.current) {
      this.count++;
      return [];
    }
    const out = this.emitRun();
    this.count = 1;
    this.current = line;
    return out;
  }

  flush(): string[] {
    const out = this.emitRun();
    this.count = 0;
    this.current = '';
    return out;
  }
}
