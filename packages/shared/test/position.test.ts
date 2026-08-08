import { describe, expect, it } from "vitest";
import { positionBetween } from "../src/position";

describe("positionBetween", () => {
  it("starts at 1 in an empty list", () => {
    expect(positionBetween(undefined, undefined)).toBe(1);
  });

  it("goes before the first item", () => {
    expect(positionBetween(undefined, 1)).toBe(0);
  });

  it("goes after the last item", () => {
    expect(positionBetween(3, undefined)).toBe(4);
  });

  it("lands between two neighbours", () => {
    const position = positionBetween(1, 2);
    expect(position).toBeGreaterThan(1);
    expect(position).toBeLessThan(2);
  });
});
