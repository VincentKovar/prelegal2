"use client";

import { pdf } from "@react-pdf/renderer";
import { useEffect, useRef, useState } from "react";
import { buildFieldSummary, buildTemplateParagraphs } from "@/lib/template";
import { PdfDocument } from "@/lib/PdfDocument";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  response: string;
  documentType?: string | null;
  suggestedDocument?: string | null;
  fields: Record<string, string>;
  isComplete: boolean;
}

interface CatalogField {
  key: string;
  label: string;
  required: boolean;
}

interface CatalogEntry {
  id: string;
  title: string;
  description: string;
  fields: CatalogField[];
}

interface DocumentChatProps {
  /** Initially selected document type, or null to start in discovery mode. */
  documentType: string | null;
  /** Called when the AI confirms/changes the active document type mid-conversation. */
  onDocumentTypeChange: (documentType: string) => void;
  catalog: CatalogEntry[];
}

export function DocumentChat({ documentType, onDocumentTypeChange, catalog }: DocumentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateBody, setTemplateBody] = useState<string | null>(null);
  const hasGreeted = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeEntry = catalog.find((entry) => entry.id === documentType) ?? null;

  useEffect(() => {
    if (hasGreeted.current) return;
    hasGreeted.current = true;

    const url = documentType
      ? `/api/chat/greeting?document_type=${encodeURIComponent(documentType)}`
      : "/api/chat/greeting";

    fetch(url)
      .then((res) => res.json())
      .then((data: ChatResponse) => {
        setMessages([{ role: "assistant", content: data.response }]);
      })
      .catch(() => setError("Couldn't reach the assistant. Please refresh and try again."))
      .finally(() => inputRef.current?.focus());
  }, [documentType]);

  useEffect(() => {
    if (!documentType) return;
    fetch(`/api/catalog/${encodeURIComponent(documentType)}/template`)
      .then((res) => res.json())
      .then((data: { body: string }) => setTemplateBody(data.body))
      .catch(() => setTemplateBody(null));
  }, [documentType]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, documentType }),
      });
      if (!res.ok) throw new Error("Chat request failed");
      const data: ChatResponse = await res.json();

      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      setFields((prev) => ({ ...prev, ...data.fields }));
      setIsComplete(data.isComplete);
      if (data.documentType && data.documentType !== documentType) {
        onDocumentTypeChange(data.documentType);
      }
    } catch {
      setError("Something went wrong talking to the assistant. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  // The input is disabled while sending, so focus() only sticks once the
  // disabled attribute clears on the next render - hence the effect here
  // rather than calling focus() directly in sendMessage's finally block.
  useEffect(() => {
    if (!isSending) inputRef.current?.focus();
  }, [isSending]);

  async function handleDownload() {
    if (!activeEntry || !templateBody) return;
    setIsDownloading(true);
    try {
      const paragraphs = buildTemplateParagraphs(templateBody, fields);
      const fieldSummary = buildFieldSummary(activeEntry.fields, fields);
      const blob = await pdf(
        <PdfDocument title={activeEntry.title} paragraphs={paragraphs} fieldSummary={fieldSummary} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${activeEntry.id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }

  const paragraphs = templateBody ? buildTemplateParagraphs(templateBody, fields) : [];

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="flex h-[28rem] flex-col gap-3 overflow-y-auto rounded border border-gray-300 p-4 dark:border-gray-600">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`max-w-[85%] rounded px-3 py-2 text-sm ${
                message.role === "user"
                  ? "ml-auto text-white"
                  : "mr-auto bg-gray-100 text-black dark:bg-gray-800 dark:text-white"
              }`}
              style={message.role === "user" ? { backgroundColor: "#209dd7" } : undefined}
            >
              {message.content}
            </div>
          ))}
          {isSending && (
            <div className="mr-auto text-sm text-gray-500 dark:text-gray-400">Thinking…</div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your reply…"
            disabled={isSending}
            className="flex-1 rounded border border-gray-300 px-3 py-2 focus:outline-none dark:border-gray-600 dark:bg-gray-900"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="rounded px-4 py-2 font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "#209dd7" }}
          >
            Send
          </button>
        </form>

        {isComplete && activeEntry && templateBody && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="rounded px-4 py-2 font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "#753991" }}
          >
            {isDownloading ? "Preparing PDF…" : `Download ${activeEntry.title} as PDF`}
          </button>
        )}
      </div>

      <div className="rounded border border-gray-300 bg-white p-6 text-sm text-black dark:border-gray-700">
        <h2 className="mb-4 text-center text-base font-bold" style={{ color: "#032147" }}>
          {activeEntry ? activeEntry.title.toUpperCase() : "SELECT A DOCUMENT TYPE"}
        </h2>
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="mb-3 text-justify leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
