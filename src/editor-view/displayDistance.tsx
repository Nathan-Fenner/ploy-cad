/**
 * Converts a numeric value into something convenient to display,
 * by truncating long decimals.
 */
export function displayDistance(distance: number): string {
  const display = distance;
  const displayRound = Math.round(distance * 1000) / 1000;

  if (String(displayRound) !== String(display)) {
    return displayRound.toFixed(3) + "...";
  }
  return String(display);
}
