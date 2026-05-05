import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  state: "open" | "closing";
};

type ToastInput = {
  title: string;
  description?: string;
};

type ToastContextValue = {
  success: (input: ToastInput) => void;
  error: (input: ToastInput) => void;
  info: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClasses: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  error: "border-rose-200 bg-rose-50 text-rose-950",
  info: "border-sky-200 bg-sky-50 text-sky-950"
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, state: "closing" } : toast))
    );
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 220);
  }, []);

  const pushToast = useCallback(
    (tone: ToastTone, input: ToastInput) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, tone, state: "open", ...input }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (input) => pushToast("success", input),
      error: (input) => pushToast("error", input),
      info: (input) => pushToast("info", input)
    }),
    [pushToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-24 z-50 grid gap-3 sm:left-auto sm:right-4 sm:w-[24rem]">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.article
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={`pointer-events-auto relative overflow-hidden rounded-[1rem] border px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.12)] ${toneClasses[toast.tone]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-1 text-sm opacity-80">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  className="rounded-full px-2 py-1 text-xs font-semibold opacity-70 transition hover:opacity-100"
                  onClick={() => dismiss(toast.id)}
                >
                  Close
                </button>
              </div>
              <motion.div
                className="toast-progress"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 4.2, ease: "linear" }}
                style={{
                  background:
                    toast.tone === "success"
                      ? "rgba(79,123,74,0.88)"
                      : toast.tone === "error"
                        ? "rgba(187,63,74,0.88)"
                        : "rgba(56,87,166,0.88)"
                }}
              />
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
