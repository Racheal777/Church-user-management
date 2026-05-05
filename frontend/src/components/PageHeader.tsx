import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function PageHeader({
  title,
  subtitle,
  backTo = "/",
  backLabel = "Back",
  actions
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  const navigate = useNavigate();

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(backTo);
  }

  return (
    <motion.div
      className="page-header-surface flex flex-wrap items-start justify-between gap-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="min-w-0">
        <button
          className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          style={{ borderColor: "var(--color-border)" }}
          onClick={handleBack}
        >
          <span aria-hidden="true">←</span>
          {backLabel}
        </button>
        <h1 className="font-display text-3xl text-[var(--color-primary)]">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </motion.div>
  );
}
