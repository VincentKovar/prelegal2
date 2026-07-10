import { NdaForm } from "./NdaForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-black">
      <main className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-2xl font-semibold text-black dark:text-zinc-50">
          Mutual NDA Creator
        </h1>
        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          Fill in the details below, preview the agreement, and download it as
          a PDF.
        </p>
        <NdaForm />
      </main>
    </div>
  );
}
