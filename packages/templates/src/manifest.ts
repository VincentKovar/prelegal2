import type { LegalTemplate } from "./types";

export const templateManifest: LegalTemplate[] = [
  {
    id: "mutual-nda",
    title: "Mutual Non-Disclosure Agreement",
    description: "Protects confidential information shared between two parties during deal discussions.",
    file: "mutual-nda.md",
    fields: [
      { key: "party_a_name", label: "Party A Name", required: true },
      { key: "party_b_name", label: "Party B Name", required: true },
      { key: "effective_date", label: "Effective Date", required: true },
      { key: "governing_law", label: "Governing Law", required: true },
    ],
  },
  {
    id: "letter-of-intent",
    title: "Letter of Intent (LOI)",
    description: "Non-binding statement of intent to acquire a target company under proposed terms.",
    file: "letter-of-intent.md",
    fields: [
      { key: "buyer_name", label: "Buyer Name", required: true },
      { key: "target_name", label: "Target Name", required: true },
      { key: "purchase_price", label: "Proposed Purchase Price", required: true },
      { key: "exclusivity_period_days", label: "Exclusivity Period (days)", required: true },
      { key: "expiration_date", label: "Expiration Date", required: true },
    ],
  },
  {
    id: "engagement-letter",
    title: "Engagement Letter",
    description: "Defines the scope of advisory services and fee arrangement with an M&A advisor.",
    file: "engagement-letter.md",
    fields: [
      { key: "advisor_name", label: "Advisor Name", required: true },
      { key: "client_name", label: "Client Name", required: true },
      { key: "fee_structure", label: "Fee Structure", required: true },
      { key: "engagement_start_date", label: "Engagement Start Date", required: true },
    ],
  },
  {
    id: "asset-purchase-agreement",
    title: "Asset Purchase Agreement",
    description: "Governs the sale of specific assets (rather than equity) from target to buyer.",
    file: "asset-purchase-agreement.md",
    fields: [
      { key: "buyer_name", label: "Buyer Name", required: true },
      { key: "seller_name", label: "Seller Name", required: true },
      { key: "asset_description", label: "Asset Description", required: true },
      { key: "purchase_price", label: "Purchase Price", required: true },
      { key: "closing_date", label: "Closing Date", required: true },
    ],
  },
  {
    id: "stock-purchase-agreement",
    title: "Stock Purchase Agreement",
    description: "Governs the sale of equity in the target company from sellers to the buyer.",
    file: "stock-purchase-agreement.md",
    fields: [
      { key: "buyer_name", label: "Buyer Name", required: true },
      { key: "seller_name", label: "Seller Name", required: true },
      { key: "shares_sold", label: "Number of Shares Sold", required: true },
      { key: "purchase_price", label: "Purchase Price", required: true },
      { key: "closing_date", label: "Closing Date", required: true },
    ],
  },
  {
    id: "due-diligence-request-list",
    title: "Due Diligence Request List",
    description: "Standard checklist of documents and information requested from a target during diligence.",
    file: "due-diligence-request-list.md",
    fields: [
      { key: "target_name", label: "Target Name", required: true },
      { key: "requesting_party", label: "Requesting Party", required: true },
      { key: "response_deadline", label: "Response Deadline", required: true },
    ],
  },
  {
    id: "term-sheet",
    title: "Term Sheet",
    description: "Summarizes key proposed deal terms before definitive agreements are drafted.",
    file: "term-sheet.md",
    fields: [
      { key: "buyer_name", label: "Buyer Name", required: true },
      { key: "target_name", label: "Target Name", required: true },
      { key: "purchase_price", label: "Purchase Price", required: true },
      { key: "payment_method", label: "Payment Method", required: true },
      { key: "expected_closing_date", label: "Expected Closing Date", required: true },
    ],
  },
  {
    id: "confidentiality-and-standstill",
    title: "Confidentiality and Standstill Agreement",
    description: "Restricts a prospective buyer from taking certain actions while evaluating a target.",
    file: "confidentiality-and-standstill.md",
    fields: [
      { key: "buyer_name", label: "Buyer Name", required: true },
      { key: "target_name", label: "Target Name", required: true },
      { key: "standstill_period_months", label: "Standstill Period (months)", required: true },
      { key: "effective_date", label: "Effective Date", required: true },
    ],
  },
];
