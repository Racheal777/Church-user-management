/**
 * Cleaning helpers for turning messy sheet exports into
 * data that matches the Prisma schema's expectations.
 */

/** Normalizes phone numbers to a consistent format for the unique constraint. */
export function normalizePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const stripped = raw.replace(/[\s()-]/g, "");
  if (!stripped) return null;
  if (stripped.startsWith("+")) return stripped;
  // Bare local Ghana number, e.g. 0247216166 -> +233247216166
  if (stripped.startsWith("0")) return "+233" + stripped.slice(1);
  return `+${stripped}`;
}

/** Only accepts strict YYYY-MM-DD dates. Anything else (ages, "14th November", "-") goes to notes instead. */
export function parseDob(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(`${trimmed}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

/** Maps the sheet's "Member Status" column to the schema's is_active boolean, keeping nuance in a note. */
export function mapMemberStatus(status: string | undefined): { is_active: boolean; statusNote?: string } {
  const s = (status || "").trim().toLowerCase();
  if (s === "yes") return { is_active: true };
  if (s === "partially") return { is_active: true, statusNote: "Partially active (per import)" };
  if (s === "no") return { is_active: false, statusNote: "Marked inactive on import" };
  if (s === "n/a") return { is_active: false, statusNote: "Graduated / N/A on import" };
  return { is_active: true };
}

export function buildNotes(remarks?: string, ageText?: string, statusNote?: string): string | null {
  const parts = [remarks?.trim(), ageText ? `Age/DOB text: ${ageText.trim()}` : undefined, statusNote].filter(Boolean);
  return parts.length ? parts.join(" | ") : null;
}