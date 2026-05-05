import { describe, expect, it } from "vitest";

import { buildPermissions } from "./permissions.js";

describe("buildPermissions", () => {
  it("grants audit access to the vice president", () => {
    expect(buildPermissions("vice_president").canViewAuditLogs).toBe(true);
  });

  it("keeps team leads at member-level access", () => {
    const permissions = buildPermissions("team_lead");
    expect(permissions.canManageMembers).toBe(false);
    expect(permissions.isAdmin).toBe(false);
  });
});
