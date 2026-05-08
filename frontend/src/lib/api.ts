export type Role =
  | "president"
  | "vice_president"
  | "secretary"
  | "financial_secretary"
  | "team_lead"
  | "member";

export type Permissions = {
  canManageMembers: boolean;
  canManageAttendance: boolean;
  canManageFinance: boolean;
  canViewAuditLogs: boolean;
  isAdmin: boolean;
};

export type Team = {
  id: string;
  name: string;
  color: string;
};

export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  whatsappNumber?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  maritalStatus?: "single" | "married" | "divorced" | "widowed" | null;
  dateJoined?: string | null;
  profilePhotoUrl?: string | null;
  role: Role;
  isActive?: boolean;
  team: Team | null;
  permissions?: Permissions;
  profile_completion?: {
    percentage: number;
    missing_fields: string[];
  };
};

export type SessionPayload = {
  member: Member & { permissions: Permissions };
  accessToken: string;
};

export type AttendanceHistoryItem = {
  sessionId: string;
  date: string;
  status: "present" | "absent";
  method: "self" | "manual" | null;
  checkInTime: string | null;
};

export type DuesLedgerItem = {
  id: string;
  memberId: string;
  weekOf: string;
  weekNumber: number;
  amount: number;
  status: "paid" | "unpaid" | "advance";
  method: string | null;
  paymentDate: string | null;
  reference?: string | null;
};

export type DuesLedgerResponse = {
  ledger: DuesLedgerItem[];
  summary: {
    totalPaid: number;
    totalOutstanding: number;
    weeksPaid: number;
    weeksBehind: number;
    totalWeeks: number;
    statusMessage: string;
  };
  annualBreakdown: Array<{
    year: number;
    totalPaid: number;
    totalOutstanding: number;
    totalWeeks: number;
    weeksPaid: number;
    weeksPending: number;
  }>;
};

export type AttendanceReport = {
  summary: {
    weeklyAttendanceRate: number;
    monthlyAttendanceRate: number;
    totalSessions: number;
  };
  absentThreePlus: Array<{
    memberId: string;
    firstName: string;
    lastName: string;
    misses: number;
  }>;
  leaderboard: Array<{
    teamId: string;
    teamName: string;
    color: string;
    score: number;
  }>;
};

export type DuesReport = {
  summary: {
    totalCollectedThisWeek: number;
    totalCollectedThisMonth: number;
    totalReceivedSoFar: number;
    projectedYearAmount: number;
    activeMembersCount: number;
    currentYear: number;
  };
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  category: "event" | "notice" | "vacancy" | "program";
  event_date: string | null;
  event_time: string | null;
  venue: string | null;
  created_at: string;
  posted_by: string;
  postedBy: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
};

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const ACCESS_TOKEN_KEY = "church-youth-access-token";

function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL ?? "http://localhost:4000";
}

export function getStoredAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredAccessToken(token: string | null) {
  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}, accessToken?: string | null): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init.headers ?? {})
    },
    credentials: "include"
  });

  if (!response.ok) {
    let message = "Request failed.";
    try {
      const data = (await response.json()) as { message?: string };
      message = data.message ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  requestOtp(phoneNumber: string) {
    return request<{ message: string }>("/api/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ phoneNumber })
    });
  },
  verifyOtp(phoneNumber: string, otpCode: string) {
    return request<SessionPayload>("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phoneNumber, otpCode })
    });
  },
  devLogin(phoneNumber: string) {
    return request<SessionPayload>("/api/auth/dev-login", {
      method: "POST",
      body: JSON.stringify({ phoneNumber })
    });
  },
  refresh() {
    return request<SessionPayload>("/api/auth/refresh", {
      method: "POST"
    });
  },
  logout(accessToken?: string | null) {
    return request<void>(
      "/api/auth/logout",
      {
        method: "POST"
      },
      accessToken
    );
  },
  me(accessToken: string) {
    return request<SessionPayload>("/api/auth/me", {}, accessToken);
  },
  listMembers(params: Record<string, string | undefined> = {}, accessToken?: string | null) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        search.set(key, value);
      }
    });
    return request<{ members: Member[] }>(`/api/members${search.size ? `?${search.toString()}` : ""}`, {}, accessToken);
  },
  createMember(body: Record<string, unknown>, accessToken: string) {
    return request<{ member: Member }>("/api/members", { method: "POST", body: JSON.stringify(body) }, accessToken);
  },
  updateMember(id: string, body: Record<string, unknown>, accessToken: string) {
    return request<{ member: Member }>(`/api/members/${id}`, { method: "PUT", body: JSON.stringify(body) }, accessToken);
  },
  updateProfilePhoto(id: string, photoUrl: string, accessToken: string) {
    return request<{ member: Member }>(`/api/members/${id}/photo`, { method: "PUT", body: JSON.stringify({ profile_photo_url: photoUrl }) }, accessToken);
  },
  deactivateMember(id: string, accessToken: string) {
    return request<void>(`/api/members/${id}`, { method: "DELETE" }, accessToken);
  },
  getAttendanceHistory(memberId: string, accessToken: string) {
    return request<{ history: AttendanceHistoryItem[] }>(`/api/members/${memberId}/attendance`, {}, accessToken);
  },
  getMemberDues(memberId: string, accessToken: string) {
    return request<DuesLedgerResponse>(`/api/members/${memberId}/dues`, {}, accessToken);
  },
  getBirthdaysThisWeek(accessToken: string, days = 7) {
    return request<{ members: Member[] }>(`/api/members/birthdays/this-week?days=${days}`, {}, accessToken);
  },
  listTeams() {
    return request<{ teams: Array<Team & { memberCount: number }> }>("/api/teams");
  },
  createTeam(body: { name: string; color: string }, accessToken: string) {
    return request<{ team: Team }>("/api/teams", { method: "POST", body: JSON.stringify(body) }, accessToken);
  },
  updateTeam(id: string, body: { name?: string; color?: string }, accessToken: string) {
    return request<{ team: Team }>(`/api/teams/${id}`, { method: "PUT", body: JSON.stringify(body) }, accessToken);
  },
  startAttendanceSession(meetingDate: string | undefined, accessToken: string) {
    return request<{
      session: { id: string; meeting_date: string };
      code: string;
      secondsRemaining: number;
    }>(
      "/api/attendance/sessions",
      { method: "POST", body: JSON.stringify({ meetingDate }) },
      accessToken
    );
  },
  getActiveAttendanceSession(accessToken: string) {
    return request<{
      isActive: boolean;
      session: {
        id: string;
        meetingDate: string;
        windowOpenAt: string;
        windowCloseAt: string | null;
        attendeeCount: number;
      } | null;
      code?: string;
      secondsRemaining?: number;
    }>("/api/attendance/sessions/active", {}, accessToken);
  },
  closeAttendanceSession(id: string, accessToken: string) {
    return request<{ session: { id: string } }>(`/api/attendance/sessions/${id}/close`, { method: "PUT" }, accessToken);
  },
  checkIn(code: string, accessToken: string) {
    return request<{ status: string; message: string }>("/api/attendance/checkin", {
      method: "POST",
      body: JSON.stringify({ code })
    }, accessToken);
  },
  manualCheckIn(phoneNumber: string, accessToken: string) {
    return request<{ record: { id: string } }>("/api/attendance/manual", {
      method: "POST",
      body: JSON.stringify({ phoneNumber })
    }, accessToken);
  },
  getAttendanceReport(accessToken: string) {
    return request<AttendanceReport>("/api/attendance/reports", {}, accessToken);
  },
  getDues(accessToken: string, memberId?: string) {
    const suffix = memberId ? `?memberId=${memberId}` : "";
    return request<DuesLedgerResponse>(`/api/dues${suffix}`, {}, accessToken);
  },
  initiateMomoPayment(body: { member_id: string; week_dates: string[]; total_amount: number }, accessToken: string) {
    return request<{ authorization_url: string; reference: string }>("/api/dues/momo/initiate", {
      method: "POST",
      body: JSON.stringify(body)
    }, accessToken);
  },
  recordCashPayment(body: { memberId?: string; phoneNumber?: string; weeks?: string[]; amount?: number }, accessToken: string) {
    return request<{ payments: Array<{ id: string }>; amountApplied: number; weeksCovered: number }>("/api/dues/cash", {
      method: "POST",
      body: JSON.stringify(body)
    }, accessToken);
  },
  getDuesReport(accessToken: string) {
    return request<DuesReport>("/api/dues/reports", {}, accessToken);
  },
  downloadStatement(year: number, accessToken: string, memberId?: string) {
    const suffix = memberId ? `&member_id=${memberId}` : "";
    return fetch(`${getApiBaseUrl()}/api/dues/statement?year=${year}${suffix}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    }).then(res => {
      if (!res.ok) throw new Error("Failed to download statement.");
      return res.blob();
    });
  },
  getAuditLogs(accessToken: string) {
    return request<{
      logs: Array<{
        id: string;
        action: string;
        entityType: string;
        entityId: string;
        createdAt: string;
        ipAddress: string;
        actor: { firstName: string; lastName: string; role: string };
      }>;
    }>("/api/audit-logs", {}, accessToken);
  },
  getUploadSignature(accessToken: string) {
    return request<{
      cloudName: string | null;
      apiKey: string | null;
      timestamp: number;
      signature: string | null;
      publicId: string;
    }>("/api/members/upload-signature", { method: "POST" }, accessToken);
  },
  getAnnouncements(category?: string, accessToken?: string | null) {
    const suffix = category ? `?category=${category}` : "";
    return request<{ announcements: Announcement[] }>(`/api/announcements${suffix}`, {}, accessToken);
  },
  getAnnouncement(id: string, accessToken: string) {
    return request<{ announcement: Announcement }>(`/api/announcements/${id}`, {}, accessToken);
  },
  postAnnouncement(body: Record<string, unknown>, accessToken: string) {
    return request<{ announcement: Announcement }>("/api/announcements", {
      method: "POST",
      body: JSON.stringify(body)
    }, accessToken);
  },
  updateAnnouncement(id: string, body: Record<string, unknown>, accessToken: string) {
    return request<{ announcement: Announcement }>(`/api/announcements/${id}`, {
      method: "PUT",
      body: JSON.stringify(body)
    }, accessToken);
  },
  deleteAnnouncement(id: string, accessToken: string) {
    return request<void>(`/api/announcements/${id}`, {
      method: "DELETE"
    }, accessToken);
  }
};

export { ApiError };
