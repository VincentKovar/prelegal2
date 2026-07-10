/**
 * Generic renderer for the {{key}}-token markdown templates in
 * packages/templates/templates/*.md, driven purely by catalog.json field
 * keys. Replaces the old NDA-only nda.ts so the same code path covers all
 * document types.
 */

export function formatDate(isoDate: string): string {
  if (!isoDate) return "____________________";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isDateLikeKey(key: string): boolean {
  return key.toLowerCase().includes("date");
}

function substituteTokens(text: string, fields: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = fields[key]?.trim();
    if (!value) return `[${key.replace(/_/g, " ")}]`;
    return isDateLikeKey(key) ? formatDate(value) : value;
  });
}

/** Strips light markdown syntax (#, **, table pipes) down to readable plain text. */
function cleanMarkdownBlock(block: string): string {
  return block
    .split("\n")
    .map((line) =>
      line
        .replace(/^#{1,6}\s*/, "")
        .replace(/\*\*/g, "")
        .replace(/^\|(.+)\|$/, (_m, row: string) =>
          row
            .split("|")
            .map((cell) => cell.trim())
            .filter(Boolean)
            .join(": ")
        )
        .replace(/^-{3,}$/, "")
    )
    .filter((line) => line.trim().length > 0)
    .join(" ")
    .trim();
}

/**
 * Splits a raw template body into blank-line-separated paragraphs, with
 * {{key}} tokens substituted from the collected field values.
 */
export function buildTemplateParagraphs(templateBody: string, fields: Record<string, string>): string[] {
  return templateBody
    .split(/\n\s*\n/)
    .map(cleanMarkdownBlock)
    .filter((block) => block.length > 0)
    .map((block) => substituteTokens(block, fields));
}

export interface FieldSummaryEntry {
  label: string;
  value: string;
}

/** Generic "Prepared for" summary of the collected fields, in place of a bespoke signature block. */
export function buildFieldSummary(
  fieldDefs: { key: string; label: string }[],
  fields: Record<string, string>
): FieldSummaryEntry[] {
  return fieldDefs.map((def) => ({
    label: def.label,
    value: fields[def.key]?.trim()
      ? isDateLikeKey(def.key)
        ? formatDate(fields[def.key])
        : fields[def.key]
      : "—",
  }));
}
