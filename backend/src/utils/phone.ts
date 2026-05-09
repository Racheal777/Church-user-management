export function normalizePhoneNumber(phoneNumber: string) {
  let cleaned = phoneNumber.replace(/[^\d+]/g, "").trim();
  if (cleaned.startsWith("0")) {
    cleaned = "+233" + cleaned.slice(1);
  }
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}
