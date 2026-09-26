/**
 * Bulk paste: one "Key : Value" per line (Flipkart-style specs).
 * First ":" on the line separates key and value (values may contain ":").
 * Lines without ":" append to the previous row's value (soft wrap).
 * Blank lines only break continuation, not the row list.
 */
export function parseSpecificationsBulkText(raw) {
  if (raw == null) return [];
  const text = String(raw).replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const rows = [];
  let continuation = false;

  for (const line of lines) {
    const trimmedEnd = line.replace(/\s+$/, "");
    const trimmed = trimmedEnd.trim();
    if (trimmed === "") {
      continuation = false;
      continue;
    }

    const colonAt = trimmed.indexOf(":");
    if (colonAt === -1) {
      if (continuation && rows.length > 0) {
        const last = rows[rows.length - 1];
        last[1] = `${last[1]}\n${trimmed}`.trim();
      }
      continue;
    }

    const key = trimmed.slice(0, colonAt).trim();
    const value = trimmed.slice(colonAt + 1).trim();
    if (!key) {
      if (continuation && rows.length > 0) {
        const last = rows[rows.length - 1];
        last[1] = `${last[1]}\n${trimmed}`.trim();
      }
      continue;
    }

    rows.push([key, value]);
    continuation = true;
  }

  return rows;
}
