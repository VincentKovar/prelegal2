import { readFileSync } from "node:fs";
import { join } from "node:path";
import { templateManifest } from "./manifest";
import type { LegalTemplate } from "./types";

export type { LegalTemplate, TemplateField } from "./types";
export { templateManifest };

const TEMPLATES_DIR = join(__dirname, "..", "templates");

export function listTemplates(): LegalTemplate[] {
  return templateManifest;
}

export function getTemplate(id: string): LegalTemplate | undefined {
  return templateManifest.find((template) => template.id === id);
}

/** Reads the raw markdown body (with {{placeholder}} tokens) for a given template id. */
export function loadTemplateBody(id: string): string {
  const template = getTemplate(id);
  if (!template) {
    throw new Error(`Unknown template id: ${id}`);
  }
  return readFileSync(join(TEMPLATES_DIR, template.file), "utf-8");
}
