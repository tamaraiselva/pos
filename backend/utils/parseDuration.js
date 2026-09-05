const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** Parses "8h", "30m", "7d" etc. into milliseconds. Falls back to 8 hours if unparsable. */
function parseDurationMs(input) {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(String(input || "").trim());
  if (!match) return 8 * UNIT_MS.h;
  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit.toLowerCase()];
}

module.exports = parseDurationMs;
