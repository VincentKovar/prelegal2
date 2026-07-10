"use client";

import { useEffect, useState } from "react";
import { DocumentChat } from "./DocumentChat";

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

const SOMETHING_ELSE = "__something_else__";

export default function Home() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [selection, setSelection] = useState<string>("");

  useEffect(() => {
    fetch("/api/catalog")
      .then((res) => res.json())
      .then((data: CatalogEntry[]) => setCatalog(data))
      .catch(() => setCatalog([]));
  }, []);

  const documentType = selection && selection !== SOMETHING_ELSE ? selection : null;
  const hasStarted = selection.length > 0;

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-black">
      <main className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-2xl font-semibold" style={{ color: "#032147" }}>
          Legal Document Creator
        </h1>
        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          Choose a document type, then chat with the assistant to fill in the details,
          preview the agreement, and download it as a PDF.
        </p>

        <div className="mb-8 max-w-md">
          <label htmlFor="document-type" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Document type
          </label>
          <select
            id="document-type"
            value={selection}
            onChange={(event) => setSelection(event.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
          >
            <option value="" disabled>
              Select a document type…
            </option>
            {catalog.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.title}
              </option>
            ))}
            <option value={SOMETHING_ELSE}>Something else / not sure</option>
          </select>
        </div>

        {hasStarted && (
          <DocumentChat
            key={selection}
            documentType={documentType}
            onDocumentTypeChange={setSelection}
            catalog={catalog}
          />
        )}
      </main>
    </div>
  );
}
