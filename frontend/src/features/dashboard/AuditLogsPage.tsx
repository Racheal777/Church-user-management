import { useQuery } from "@tanstack/react-query";

import { Loader } from "../../components/Loader";
import { PageHeader } from "../../components/PageHeader";
import { SectionCard } from "../../components/SectionCard";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthContext";

export function AuditLogsPage() {
  const { accessToken } = useAuth();
  const auditQuery = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => api.getAuditLogs(accessToken!),
    enabled: Boolean(accessToken)
  });

  return (
    <div className="page-stack">
      <PageHeader
        title="Audit Logs"
        subtitle="Trace every administrative write action with actor, target, and timing details."
        backTo="/"
        backLabel="Back Dashboard"
      />
      <SectionCard title="Audit Logs" subtitle="Every admin write action lands here for accountability.">
        <div className="grid gap-3">
          {auditQuery.isLoading ? (
            <Loader label="Loading audit trail..." />
          ) : auditQuery.data?.logs.length ? (
            auditQuery.data.logs.map((log) => (
              <article key={log.id} className="rounded-xl border bg-slate-50 px-4 py-4" style={{ borderColor: "var(--color-border)" }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {log.action} · {log.entityType}
                    </p>
                    <p className="text-sm text-slate-500">
                      {log.actor.firstName} {log.actor.lastName} · {log.actor.role.replace("_", " ")}
                    </p>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <p>{new Date(log.createdAt).toLocaleString()}</p>
                    <p>{log.ipAddress}</p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No audit events have been recorded yet.
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
