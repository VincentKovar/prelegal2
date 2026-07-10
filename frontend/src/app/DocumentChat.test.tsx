import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { DocumentChat } from "./DocumentChat";

vi.mock("@react-pdf/renderer", () => ({
  pdf: () => ({ toBlob: async () => new Blob(["pdf"], { type: "application/pdf" }) }),
  StyleSheet: { create: (styles: unknown) => styles },
  Document: (props: { children?: React.ReactNode }) => props.children,
  Page: (props: { children?: React.ReactNode }) => props.children,
  Text: (props: { children?: React.ReactNode }) => props.children,
  View: (props: { children?: React.ReactNode }) => props.children,
}));

const CATALOG = [
  {
    id: "mutual-nda",
    title: "Mutual Non-Disclosure Agreement",
    description: "Protects confidential information.",
    fields: [
      { key: "party_a_name", label: "Party A Name", required: true },
      { key: "party_b_name", label: "Party B Name", required: true },
      { key: "effective_date", label: "Effective Date", required: true },
      { key: "governing_law", label: "Governing Law", required: true },
    ],
  },
];

const TEMPLATE_BODY = {
  body: "This Mutual Non-Disclosure Agreement is entered into by {{party_a_name}} and {{party_b_name}}.",
};

const GREETING = {
  response: "Hello! Let's start with the two parties involved - what are their names?",
  documentType: "mutual-nda",
  fields: {},
  isComplete: false,
};

const FOLLOW_UP = {
  response: "Great, what's the effective date and governing law?",
  documentType: "mutual-nda",
  fields: { party_a_name: "Acme Inc.", party_b_name: "Beta LLC" },
  isComplete: false,
};

const COMPLETE = {
  response: "All set! Here's your summary.",
  documentType: "mutual-nda",
  fields: {
    party_a_name: "Acme Inc.",
    party_b_name: "Beta LLC",
    effective_date: "2026-07-10",
    governing_law: "Delaware",
  },
  isComplete: true,
};

function mockFetchSequence(...responses: unknown[]) {
  const fn = vi.fn();
  for (const body of responses) {
    fn.mockResolvedValueOnce({ ok: true, json: async () => body });
  }
  global.fetch = fn;
  return fn;
}

describe("DocumentChat", () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => "blob:mock");
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the greeting for the pinned document type and shows no download button yet", async () => {
    mockFetchSequence(GREETING, TEMPLATE_BODY);

    render(<DocumentChat documentType="mutual-nda" onDocumentTypeChange={() => {}} catalog={CATALOG} />);

    await waitFor(() => expect(screen.getByText(GREETING.response)).toBeInTheDocument());
    expect(screen.queryByText(/Download .* as PDF/i)).not.toBeInTheDocument();
  });

  it("returns focus to the input after each send", async () => {
    mockFetchSequence(GREETING, TEMPLATE_BODY, FOLLOW_UP);

    render(<DocumentChat documentType="mutual-nda" onDocumentTypeChange={() => {}} catalog={CATALOG} />);
    await waitFor(() => expect(screen.getByText(GREETING.response)).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/type your reply/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Acme Inc. and Beta LLC" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText(FOLLOW_UP.response)).toBeInTheDocument());
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it("sends a message, extracts fields, and reveals download once complete", async () => {
    mockFetchSequence(GREETING, TEMPLATE_BODY, FOLLOW_UP, COMPLETE);

    render(<DocumentChat documentType="mutual-nda" onDocumentTypeChange={() => {}} catalog={CATALOG} />);
    await waitFor(() => expect(screen.getByText(GREETING.response)).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/type your reply/i);
    fireEvent.change(input, { target: { value: "Acme Inc. and Beta LLC" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText(FOLLOW_UP.response)).toBeInTheDocument());
    expect(screen.queryByText(/Download .* as PDF/i)).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "2026-07-10, Delaware" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText(COMPLETE.response)).toBeInTheDocument());
    expect(
      screen.getByRole("button", { name: /download mutual non-disclosure agreement as pdf/i })
    ).toBeInTheDocument();
  });

  it("starts in discovery mode when documentType is null and adopts the type once the AI confirms one", async () => {
    const DISCOVERY_GREETING = {
      response: "Hi! What are you working on?",
      documentType: null,
      fields: {},
      isComplete: false,
    };
    const CONFIRMED = {
      response: "Sounds like a Mutual NDA - let's start with the parties.",
      documentType: "mutual-nda",
      fields: {},
      isComplete: false,
    };
    const fetchMock = mockFetchSequence(DISCOVERY_GREETING, CONFIRMED);
    const onDocumentTypeChange = vi.fn();

    render(<DocumentChat documentType={null} onDocumentTypeChange={onDocumentTypeChange} catalog={CATALOG} />);
    await waitFor(() => expect(screen.getByText(DISCOVERY_GREETING.response)).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/type your reply/i);
    fireEvent.change(input, { target: { value: "I need to protect confidential info with a partner" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(onDocumentTypeChange).toHaveBeenCalledWith("mutual-nda"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat/message",
      expect.objectContaining({
        body: expect.stringContaining('"documentType":null'),
      })
    );
  });
});
