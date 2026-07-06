import { parse } from "csv-parse/sync";
import fs from "node:fs";
import path from "node:path";
import { normalizePhone, parseDob, mapMemberStatus, buildNotes } from "../src/lib/normalize";

const RAW_DIR = path.join(__dirname, "/data/raw");
const OUT_FILE = path.join(__dirname, "/data/members.json");
const SKIPPED_FILE = path.join(__dirname, "/data/skipped.json");

type RawRow = {
  Team: string;
  "First Name": string;
  "Last Name": string;
  Phone: string;
  Email?: string;
  "Date of Birth"?: string;
  "Age / DOB (original text)"?: string;
  Location?: string;
  Profession?: string;
  "Member Status"?: string;
  Remarks?: string;
};

function main() {
  const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith(".csv"));
  if (files.length === 0) {
    console.error(`No CSV files found in ${RAW_DIR}. See the setup comment at the top of this file.`);
    process.exit(1);
  }

  const seenPhones = new Map<string, string>(); // phone -> file it first appeared in
  const members: Record<string, unknown>[] = [];
  const skipped: Record<string, unknown>[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(RAW_DIR, file), "utf-8");
    const rows: RawRow[] = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

    for (const row of rows) {
      const phone = normalizePhone(row.Phone);

      if (!phone) {
        skipped.push({ ...row, sourceFile: file, reason: "missing or unparsable phone number" });
        continue;
      }

      if (seenPhones.has(phone)) {
        skipped.push({ ...row, sourceFile: file, reason: `duplicate phone ${phone} (first seen in ${seenPhones.get(phone)})` });
        continue;
      }
      seenPhones.set(phone, file);

      const { is_active, statusNote } = mapMemberStatus(row["Member Status"]);

      members.push({
        team: row.Team?.trim(),
        first_name: row["First Name"]?.trim() || "Unknown",
        last_name: row["Last Name"]?.trim() || "Unknown",
        phone_number: phone,
        email: row.Email?.trim() || null,
        location: row.Location?.trim() || null,
        profession: row.Profession?.trim() || null,
        date_of_birth: parseDob(row["Date of Birth"]),
        is_active,
        notes: buildNotes(row.Remarks, row["Age / DOB (original text)"], statusNote),
      });
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(members, null, 2));
  console.info(`Wrote ${members.length} members to ${OUT_FILE}`);

  if (skipped.length) {
    fs.writeFileSync(SKIPPED_FILE, JSON.stringify(skipped, null, 2));
    console.warn(`Skipped ${skipped.length} rows — review ${SKIPPED_FILE} before seeding.`);
  }
}

main();