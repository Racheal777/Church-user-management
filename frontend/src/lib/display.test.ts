import { describe, expect, it } from "vitest";

import { calculateProfileCompletion, formatRoleLabel } from "./display";

describe("display helpers", () => {
  it("formats underscored roles for the UI", () => {
    expect(formatRoleLabel("vice_president")).toBe("vice president");
  });

  it("calculates profile completion from optional fields", () => {
    expect(
      calculateProfileCompletion({
        email: "member@example.com",
        whatsappNumber: null,
        profilePhotoUrl: "https://example.com/photo.jpg",
        dateOfBirth: null
      })
    ).toBe(67);
  });
});
