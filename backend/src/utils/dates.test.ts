import { describe, expect, it } from "vitest";

import { getWeekMonday } from "./dates.js";

describe("getWeekMonday", () => {
  it("returns Monday for a Sunday date", () => {
    const monday = getWeekMonday(new Date("2026-05-10T12:00:00.000Z"));
    expect(monday.toISOString()).toBe("2026-05-04T00:00:00.000Z");
  });

  it("returns the same day when the input is Monday", () => {
    const monday = getWeekMonday(new Date("2026-05-04T18:30:00.000Z"));
    expect(monday.toISOString()).toBe("2026-05-04T00:00:00.000Z");
  });
});
