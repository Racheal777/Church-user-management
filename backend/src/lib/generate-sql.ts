/**
 * Generates ONE .sql file you run directly against the database (psql, DBeaver,
 * pgAdmin — your choice). No Prisma client, no S3, no JSON hop.
 *
 * Still requires the raw CSV exports in data/raw/ (see build-members-json.ts
 * header comment for the export steps) because the sheet data needs the same
 * cleanup either way: phone formatting, DOB parsing, status mapping, dedup.
 *
 * Requires @@unique([name]) on Branch (see schema-change.md) so the ON CONFLICT
 * clause has something to key off. Team already has @@unique([name, branch_id]),
 * and Member already has phone_number as unique — both usable as-is.
 *
 * npm i -D csv-parse
 * npx ts-node prisma-seed/lib/generate-sql.ts
 *
 * Then review the output file, and run it:
 *   psql "$DATABASE_URL" -f prisma-seed/data/frafraha-seed.sql
 *
 * Treat the generated .sql file exactly like members.json: it has real PII in
 * it. Don't commit it to git. Delete it after running, or keep a copy somewhere
 * private (password manager, encrypted folder) if you want it for
 * disaster-recovery re-seeding later.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { normalizePhone, parseDob, mapMemberStatus, buildNotes } from "./normalize.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAW_DIR = path.join(__dirname, "../../prisma/data/raw");
const OUT_FILE = path.join(__dirname, "../../prisma/data/frafraha-seed.sql");
const SKIPPED_FILE = path.join(__dirname, "../../prisma/data/skipped.json");

const BRANCH_NAME = "Frafraha Branch";
const BRANCH_LOCATION = "Frafraha";
// Update colors to your real team colors before running.
const TEAMS: { name: string; color: string }[] = [
  { name: "Atkinson", color: "#0d3b66" },
  { name: "Zimmerman", color: "#b22234" },
  { name: "Ritz", color: "#2a9d8f" },
  { name: "Ramseyer", color: "#e76f51" },
];

function sqlStr(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}
function sqlDate(d: Date | null): string {
  return d ? `'${d.toISOString().slice(0, 10)}'` : "NULL";
}
function sqlBool(b: boolean): string {
  return b ? "TRUE" : "FALSE";
}

function main() {
  const lines: string[] = [];
  lines.push("BEGIN;");
  lines.push('CREATE EXTENSION IF NOT EXISTS pgcrypto;'); // enables gen_random_uuid()
  lines.push("");

  lines.push("-- Branch");
  lines.push(
    `INSERT INTO "Branch" (id, name, location) VALUES (gen_random_uuid(), ${sqlStr(BRANCH_NAME)}, ${sqlStr(BRANCH_LOCATION)})`
  );
  lines.push(`ON CONFLICT (name) DO UPDATE SET location = EXCLUDED.location;`);
  lines.push("");

  lines.push("-- Teams");
  for (const team of TEAMS) {
    lines.push(
      `INSERT INTO "Team" (id, name, color, branch_id, updated_at) VALUES (gen_random_uuid(), ${sqlStr(team.name)}, ${sqlStr(team.color)}, (SELECT id FROM "Branch" WHERE name = ${sqlStr(BRANCH_NAME)}), now())`
    );
    lines.push(`ON CONFLICT (name, branch_id) DO UPDATE SET color = EXCLUDED.color, updated_at = now();`);
  }
  lines.push("");

  const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith(".csv"));
  if (files.length === 0) {
    console.error(`No CSVs in ${RAW_DIR}. Export each sheet tab as CSV first.`);
    process.exit(1);
  }

  const seenPhones = new Map<string, string>();
  const skipped: Record<string, unknown>[] = [];

  lines.push("-- Members");
  for (const file of files) {
    const raw = fs.readFileSync(path.join(RAW_DIR, file), "utf-8");
    const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

    for (const row of rows) {
      const phone = normalizePhone(row.Phone);
      if (!phone) {
        skipped.push({ ...row, sourceFile: file, reason: "missing/unparsable phone" });
        continue;
      }
      if (seenPhones.has(phone)) {
        skipped.push({ ...row, sourceFile: file, reason: `duplicate phone ${phone} (first in ${seenPhones.get(phone)})` });
        continue;
      }
      seenPhones.set(phone, file);

      const { is_active, statusNote } = mapMemberStatus(row["Member Status"]);
      const notes = buildNotes(row.Remarks, row["Age / DOB (original text)"], statusNote);
      const dob = parseDob(row["Date of Birth"]);
      const team = row.Team?.trim();

      lines.push(`INSERT INTO "Member" (id, first_name, last_name, phone_number, email, location, profession, date_of_birth, is_active, notes, team_id, branch_id, date_joined, updated_at)
VALUES (gen_random_uuid(), ${sqlStr(row["First Name"]?.trim())}, ${sqlStr(row["Last Name"]?.trim())}, ${sqlStr(phone)}, ${sqlStr(row.Email?.trim())}, ${sqlStr(row.Location?.trim())}, ${sqlStr(row.Profession?.trim())}, ${sqlDate(dob)}, ${sqlBool(is_active)}, ${sqlStr(notes)}, (SELECT id FROM "Team" WHERE name = ${sqlStr(team)} AND branch_id = (SELECT id FROM "Branch" WHERE name = ${sqlStr(BRANCH_NAME)})), (SELECT id FROM "Branch" WHERE name = ${sqlStr(BRANCH_NAME)}), now(), now())
ON CONFLICT (phone_number) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  location = EXCLUDED.location,
  profession = EXCLUDED.profession,
  date_of_birth = EXCLUDED.date_of_birth,
  is_active = EXCLUDED.is_active,
  notes = EXCLUDED.notes,
  team_id = EXCLUDED.team_id,
  branch_id = EXCLUDED.branch_id,
  updated_at = now();`);
    }
  }

  lines.push("");
  lines.push("COMMIT;");

  fs.writeFileSync(OUT_FILE, lines.join("\n"));
  console.info(`Wrote SQL to ${OUT_FILE}`);

  if (skipped.length) {
    fs.writeFileSync(SKIPPED_FILE, JSON.stringify(skipped, null, 2));
    console.warn(`Skipped ${skipped.length} rows — review ${SKIPPED_FILE} before running the SQL.`);
  }
}

main();