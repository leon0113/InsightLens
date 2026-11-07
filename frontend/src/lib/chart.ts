/**
 * Up to `count` evenly spaced, round tick values inside [min, max], such as
 * 80, 100, 120 for a range of 80 to 162. Steps are 1, 2, 2.5 or 5 times a
 * power of ten, so labels stay easy to read.
 */
export function niceTicks(min: number, max: number, count = 6): number[] {
  if (!(max > min)) return [min];
  const rawStep = (max - min) / count;
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rawStep) ??
    10 * power;

  const ticks: number[] = [];
  for (
    let tick = Math.ceil(min / step) * step;
    tick <= max + step * 1e-9;
    tick += step
  ) {
    // Rounding removes floating point noise such as 0.30000000000000004.
    ticks.push(Number(tick.toPrecision(12)));
  }
  return ticks;
}
