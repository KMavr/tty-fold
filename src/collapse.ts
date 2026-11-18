const MIN_RUN = 3;

export function collapseRepeats(lines: string[]): string[] {
  let count = 0;
  let current = lines[0];
  const result: string[] = [];

  const addToResult = () => {
    const isBlank = current === '';
    if (count < MIN_RUN || isBlank) {
      for (let j = 0; j < count; j++) {
        result.push(current);
      }
    } else {
      result.push(`${current} (×${count})`);
    }
  };

  for (const line of lines) {
    if (line === current) {
      count++;
    } else {
      addToResult();
      count = 1;
    }
    current = line;
  }
  addToResult();

  return result;
}
