export const range = (start: number, stop: number, step?: number): number[] => {
  const a = [start];
  let b = start;
  while (b < stop) {
    a.push((b += step || 1));
  }
  return a;
};
