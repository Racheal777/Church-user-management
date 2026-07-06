import type { DuesLedgerItem, DuesLedgerResponse } from "../../lib/api";
import clsx from "clsx";
import { motion } from "framer-motion";

export const MONTHLY_DUES_AMOUNT = 2;
export const WEEKLY_DUES_AMOUNT = MONTHLY_DUES_AMOUNT;
export const currentDate = new Date();
export const currentYear = currentDate.getUTCFullYear();
export const currentMonth = currentDate.getUTCMonth();
export const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const weekDayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function YearFilterChips({
  years,
  activeYear,
  onChange
}: {
  years: string[];
  activeYear: string;
  onChange: (year: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {years.map((year) => (
        <button
          key={year}
          className={clsx(
            "inline-flex min-h-[2.5rem] items-center rounded-xl border px-5 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
            year === activeYear ? "bg-blue-700 text-white border-blue-700 shadow-lg shadow-blue-900/10" : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
          )}
          onClick={() => onChange(year)}
        >
          {year}
        </button>
      ))}
    </div>
  );
}

export function DuesMonthCalendar({
  rows,
  year,
  title,
  subtitle
}: {
  rows: DuesLedgerItem[];
  year: number;
  title: string;
  subtitle: string;
}) {
  const monthRows = rows.filter((row) => {
    const date = new Date(row.weekOf);
    return date.getUTCFullYear() === year && date.getUTCMonth() === currentMonth;
  });
  const rowsByIso = new Map(monthRows.map((row) => [toIsoDate(row.weekOf), row]));

  const monthStart = new Date(Date.UTC(year, currentMonth, 1));
  const monthEnd = new Date(Date.UTC(year, currentMonth + 1, 0));
  const calendarStart = startOnMonday(monthStart);
  const calendarEnd = endOnSunday(monthEnd);
  const days: Date[] = [];

  for (let cursor = new Date(calendarStart); cursor <= calendarEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    days.push(new Date(cursor));
  }

  return (
    <div className="w-full space-y-6">
      {(title || subtitle) && (
        <div className="flex flex-wrap items-start justify-between gap-3 px-1">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{title}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest">
            <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Paid
            </span>
            <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
            </span>
          </div>
        </div>
      )}

      <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-50 shadow-inner">
        <div className="grid grid-cols-7 gap-2 text-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 mb-4">
          {weekDayNames.map((day) => (
            <div key={day}>{day[0]}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const isCurrentMonth = day.getUTCMonth() === currentMonth;
            const row = rowsByIso.get(toIsoDate(day));
            const isPaid = row?.status === "paid";

            return (
              <div
                key={day.toISOString()}
                className={clsx(
                  "aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all group overflow-hidden",
                  isCurrentMonth ? "bg-white" : "bg-transparent opacity-30",
                  row ? (isPaid ? "ring-2 ring-emerald-500/5" : "ring-2 ring-amber-500/5") : "border border-slate-100"
                )}
              >
                <span className={clsx(
                  "text-[10px] font-black z-10",
                  isCurrentMonth ? "text-slate-900" : "text-slate-400"
                )}>
                  {day.getUTCDate()}
                </span>
                
                {row && (
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className={clsx(
                      "absolute inset-0 z-0 opacity-10",
                      isPaid ? "bg-emerald-500" : "bg-amber-500"
                    )}
                  />
                )}
                
                {row && (
                  <div className={clsx(
                    "absolute bottom-1 w-1 h-1 rounded-full",
                    isPaid ? "bg-emerald-500" : "bg-amber-500"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SummaryTile({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={clsx(
      "rounded-2xl bg-slate-50 px-5 border border-slate-50 flex flex-col gap-1",
      compact ? "py-3" : "py-4"
    )}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={clsx(
        "font-black text-slate-900 tracking-tight",
        compact ? "text-sm" : "text-base"
      )}>{value}</p>
    </div>
  );
}

export function getYearOptions(data: DuesLedgerResponse | undefined) {
  const years = new Set(data?.annualBreakdown.map((item) => String(item.year)) ?? []);
  years.add(String(currentYear));
  return [...years].sort((left, right) => Number(right) - Number(left));
}

export function getYearSummary(data: DuesLedgerResponse | undefined, year: string) {
  const match = data?.annualBreakdown.find((item) => String(item.year) === year);
  return (
    match ?? {
      year: Number(year),
      totalDue: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      totalMonths: 0,
      monthsPaid: 0,
      monthsPending: 0,
      totalWeeks: 0,
      weeksPaid: 0,
      weeksPending: 0
    }
  );
}

export function formatMoney(amount: number) {
  return amount.toFixed(2);
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function startOnMonday(date: Date) {
  const next = new Date(date);
  const day = next.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setUTCDate(next.getUTCDate() + offset);
  return next;
}

function endOnSunday(date: Date) {
  const next = new Date(date);
  const day = next.getUTCDay();
  const offset = day === 0 ? 0 : 7 - day;
  next.setUTCDate(next.getUTCDate() + offset);
  return next;
}

function toIsoDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}
