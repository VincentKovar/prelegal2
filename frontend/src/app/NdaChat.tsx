"use client";

import { pdf } from "@react-pdf/renderer";
import { useEffect, useRef, useState } from "react";
import { buildNdaParagraphs, emptyNdaFormData, NdaFormData } from "@/lib/nda";
import { NdaPdfDocument } from "@/lib/NdaPdfDocument";

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

export function NdaChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [fields, setFields] = useState<NdaFormData>(emptyNdaFormData);
  const [isComplete, setIsComplete] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasGreeted = useRef(false);

  useEffect(() => {
    if (hasGreeted.current) return;
    hasGreeted.current = true;

    fetch("/api/chat/greeting")
      .then((res) => res.json())
      .then((data: ChatResponse) => {
        setMessages([{ role: "assistant", content: data.response }]);
      })
      .catch(() => setError("Couldn't reach the assistant. Please refresh and try again."));
  }, []);

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
        body: JSON.stringify({ messages: nextMessages }),
      });
      if (!res.ok) throw new Error("Chat request failed");
      const data: ChatResponse = await res.json();

      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      setFields((prev) => ({ ...prev, ...data.fields }));
      setIsComplete(data.isComplete);
    } catch {
      setError("Something went wrong talking to the assistant. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const blob = await pdf(<NdaPdfDocument data={fields} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mutual-nda.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }

  const paragraphs = buildNdaParagraphs(fields);

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

        {isComplete && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="rounded px-4 py-2 font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "#753991" }}
          >
            {isDownloading ? "Preparing PDF…" : "Download NDA as PDF"}
          </button>
        )}
      </div>

      <div className="rounded border border-gray-300 bg-white p-6 text-sm text-black dark:border-gray-700">
        <h2 className="mb-4 text-center text-base font-bold" style={{ color: "#032147" }}>
          MUTUAL NON-DISCLOSURE AGREEMENT
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
