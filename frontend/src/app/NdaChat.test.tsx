import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { NdaChat } from "./NdaChat";

vi.mock("@react-pdf/renderer", () => ({
  pdf: () => ({ toBlob: async () => new Blob(["pdf"], { type: "application/pdf" }) }),
  StyleSheet: { create: (styles: unknown) => styles },
  Document: (props: { children?: React.ReactNode }) => props.children,
  Page: (props: { children?: React.ReactNode }) => props.children,
  Text: (props: { children?: React.ReactNode }) => props.children,
  View: (props: { children?: React.ReactNode }) => props.children,
}));

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

describe("NdaChat", () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => "blob:mock");
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the greeting on mount and shows no download button yet", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => GREETING });

    render(<NdaChat />);

    await waitFor(() => expect(screen.getByText(GREETING.response)).toBeInTheDocument());
    expect(screen.queryByText(/Download NDA as PDF/i)).not.toBeInTheDocument();
  });

  it("sends a message, extracts fields, and reveals download once complete", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => GREETING })
      .mockResolvedValueOnce({ ok: true, json: async () => FOLLOW_UP })
      .mockResolvedValueOnce({ ok: true, json: async () => COMPLETE });
    global.fetch = fetchMock;

    render(<NdaChat />);
    await waitFor(() => expect(screen.getByText(GREETING.response)).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/type your reply/i);
    fireEvent.change(input, { target: { value: "Acme Inc. and Beta LLC" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText(FOLLOW_UP.response)).toBeInTheDocument());
    expect(screen.getAllByText(/Acme Inc\./).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Download NDA as PDF/i)).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "2026-07-10, Delaware" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText(COMPLETE.response)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /download nda as pdf/i })).toBeInTheDocument();
  });
});
