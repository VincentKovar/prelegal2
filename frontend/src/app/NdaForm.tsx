"use client";

import { pdf } from "@react-pdf/renderer";
import { useState } from "react";
import { buildNdaParagraphs, emptyNdaFormData, NdaFormData } from "@/lib/nda";
import { NdaPdfDocument } from "@/lib/NdaPdfDocument";

const fields: Array<{
  key: keyof NdaFormData;
  label: string;
  placeholder: string;
  type?: string;
}> = [
  { key: "partyAName", label: "Party A Name", placeholder: "Acme Corp." },
  {
    key: "partyAAddress",
    label: "Party A Address",
    placeholder: "123 Main St, Springfield, IL",
  },
  { key: "partyBName", label: "Party B Name", placeholder: "Beta LLC" },
  {
    key: "partyBAddress",
    label: "Party B Address",
    placeholder: "456 Market St, Austin, TX",
  },
  { key: "effectiveDate", label: "Effective Date", type: "date", placeholder: "" },
  {
    key: "governingState",
    label: "Governing State",
    placeholder: "Delaware",
  },
  { key: "termYears", label: "Term (years)", type: "number", placeholder: "2" },
];

export function NdaForm() {
  const [formData, setFormData] = useState<NdaFormData>(emptyNdaFormData);
  const [isDownloading, setIsDownloading] = useState(false);

  const paragraphs = buildNdaParagraphs(formData);

  function handleChange(key: keyof NdaFormData, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const blob = await pdf(<NdaPdfDocument data={formData} />).toBlob();
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

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleDownload();
        }}
      >
        {fields.map((field) => (
          <label key={field.key} className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{field.label}</span>
            <input
              type={field.type ?? "text"}
              placeholder={field.placeholder}
              value={formData[field.key]}
              onChange={(event) => handleChange(field.key, event.target.value)}
              className="rounded border border-gray-300 px-3 py-2 focus:border-black focus:outline-none dark:border-gray-600 dark:bg-gray-900"
            />
          </label>
        ))}
        <button
          type="submit"
          disabled={isDownloading}
          className="mt-2 rounded bg-black px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {isDownloading ? "Preparing PDF…" : "Download NDA as PDF"}
        </button>
      </form>

      <div className="rounded border border-gray-300 bg-white p-6 text-sm text-black dark:border-gray-700">
        <h2 className="mb-4 text-center text-base font-bold">
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
