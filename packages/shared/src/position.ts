// cards and columns are ordered by a number instead of living in a Y.Array.
// moving a card is then a single field change, so two people moving the same
// card at once can't end up duplicating it.
export function positionBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return 1;
  if (before === undefined) return after! - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}
