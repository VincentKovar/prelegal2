export interface TemplateField {
  /** Placeholder token used in the template body, e.g. "party_name" for {{party_name}} */
  key: string;
  label: string;
  required: boolean;
}

export interface LegalTemplate {
  id: string;
  title: string;
  description: string;
  /** Relative path to the markdown file under packages/templates/templates */
  file: string;
  fields: TemplateField[];
}
