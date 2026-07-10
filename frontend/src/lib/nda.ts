export interface NdaFormData {
  partyAName: string;
  partyAAddress: string;
  partyBName: string;
  partyBAddress: string;
  effectiveDate: string;
  governingState: string;
  termYears: string;
}

export const emptyNdaFormData: NdaFormData = {
  partyAName: "",
  partyAAddress: "",
  partyBName: "",
  partyBAddress: "",
  effectiveDate: "",
  governingState: "",
  termYears: "",
};

export function formatDate(isoDate: string): string {
  if (!isoDate) return "____________________";
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fallback(value: string, placeholder: string): string {
  return value.trim() || placeholder;
}

export function buildNdaParagraphs(data: NdaFormData): string[] {
  const partyA = fallback(data.partyAName, "[Party A Name]");
  const partyAAddress = fallback(data.partyAAddress, "[Party A Address]");
  const partyB = fallback(data.partyBName, "[Party B Name]");
  const partyBAddress = fallback(data.partyBAddress, "[Party B Address]");
  const date = formatDate(data.effectiveDate);
  const state = fallback(data.governingState, "[Governing State]");
  const term = fallback(data.termYears, "[__]");

  return [
    `This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of ${date} (the "Effective Date"), by and between ${partyA}, located at ${partyAAddress} ("Party A"), and ${partyB}, located at ${partyBAddress} ("Party B"), each referred to individually as a "Party" and collectively as the "Parties."`,
    `1. Purpose. The Parties wish to explore a potential business relationship and, in connection therewith, may disclose to each other certain confidential technical and business information which the disclosing Party desires to protect against unrestricted disclosure or competitive use.`,
    `2. Confidential Information. "Confidential Information" means any non-public information disclosed by either Party to the other, whether orally, in writing, or in any other form, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure.`,
    `3. Obligations. Each Party agrees to: (a) hold the other Party's Confidential Information in strict confidence; (b) not disclose such Confidential Information to any third party without prior written consent; and (c) use the Confidential Information solely for the purpose of evaluating the potential business relationship between the Parties.`,
    `4. Exclusions. Confidential Information does not include information that: (a) is or becomes publicly available through no fault of the receiving Party; (b) was rightfully known by the receiving Party prior to disclosure; (c) is rightfully received from a third party without breach of any confidentiality obligation; or (d) is independently developed without use of the disclosing Party's Confidential Information.`,
    `5. Term. This Agreement and the obligations herein shall remain in effect for a period of ${term} year(s) from the Effective Date, unless earlier terminated by mutual written consent of the Parties.`,
    `6. Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the State of ${state}, without regard to its conflict of laws principles.`,
    `7. No License. Nothing in this Agreement shall be construed as granting any rights, by license or otherwise, to any Confidential Information disclosed hereunder, except as expressly set forth herein.`,
    `IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.`,
  ];
}
