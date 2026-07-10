import { NdaChat } from "./NdaChat";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-black">
      <main className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-2xl font-semibold" style={{ color: "#032147" }}>
          Mutual NDA Creator
        </h1>
        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          Chat with the assistant to fill in the details, preview the
          agreement, and download it as a PDF.
        </p>
        <NdaChat />
      </main>
    </div>
  );
}
