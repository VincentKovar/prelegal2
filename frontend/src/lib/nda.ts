export interface NdaFormData {
  party_a_name: string;
  party_b_name: string;
  effective_date: string;
  governing_law: string;
}

export const NDA_FIELD_KEYS: (keyof NdaFormData)[] = [
  "party_a_name",
  "party_b_name",
  "effective_date",
  "governing_law",
];

export const emptyNdaFormData: NdaFormData = {
  party_a_name: "",
  party_b_name: "",
  effective_date: "",
  governing_law: "",
};

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

function fallback(value: string, placeholder: string): string {
  return value.trim() || placeholder;
}

/**
 * Mirrors packages/templates/templates/mutual-nda.md so the PDF matches the
 * canonical template's language.
 */
export function buildNdaParagraphs(data: NdaFormData): string[] {
  const partyA = fallback(data.party_a_name, "[Party A Name]");
  const partyB = fallback(data.party_b_name, "[Party B Name]");
  const date = formatDate(data.effective_date);
  const law = fallback(data.governing_law, "[Governing Law]");

  return [
    `This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of ${date} by and between ${partyA} and ${partyB} (each a "Party" and together the "Parties").`,
    `1. Purpose. The Parties wish to explore a potential business relationship, including a possible acquisition, and in connection with that opportunity may disclose confidential information to each other.`,
    `2. Confidential Information. Each Party agrees to protect the other Party's confidential information with the same degree of care it uses for its own confidential information, and not to disclose it to third parties without prior written consent.`,
    `3. Term. This Agreement remains in effect for two (2) years from ${date}, unless terminated earlier by mutual written agreement.`,
    `4. Governing Law. This Agreement is governed by the laws of ${law}.`,
  ];
}
