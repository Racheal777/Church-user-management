import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function SectionCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      className="section-card-surface card-lift rounded-[1.25rem] border p-5 shadow-[var(--shadow-card)] backdrop-blur"
      style={{ borderColor: "var(--color-border)" }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
    >
      <div className="mb-4">
        <h2 className="font-display text-2xl text-[var(--color-primary)]">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </motion.section>
  );
}
