export function buildOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Church Youth Management System API",
      version: "1.0.0"
    },
    servers: [
      {
        url: "http://localhost:4000"
      }
    ],
    paths: {
      "/api/auth/request-otp": { post: { summary: "Request a one-time password" } },
      "/api/auth/verify-otp": { post: { summary: "Verify OTP and create a session" } },
      "/api/auth/refresh": { post: { summary: "Refresh the access token" } },
      "/api/auth/logout": { post: { summary: "Logout current session" } },
      "/api/auth/me": { get: { summary: "Get current member session" } },
      "/api/members": { get: { summary: "List members" }, post: { summary: "Create member" } },
      "/api/members/{id}": {
        get: { summary: "Get a member" },
        put: { summary: "Update a member" },
        delete: { summary: "Deactivate a member" }
      },
      "/api/teams": { get: { summary: "List teams" }, post: { summary: "Create a team" } },
      "/api/attendance/sessions": { post: { summary: "Start attendance session" } },
      "/api/attendance/sessions/active": { get: { summary: "Get active attendance session" } },
      "/api/attendance/checkin": { post: { summary: "Self check-in" } },
      "/api/attendance/manual": { post: { summary: "Manual check-in" } },
      "/api/dues": { get: { summary: "List dues ledger" } },
      "/api/dues/cash": { post: { summary: "Record cash dues payment" } },
      "/api/dues/reports": { get: { summary: "Get dues reports" } },
      "/api/audit-logs": { get: { summary: "List audit logs" } }
    }
  };
}
