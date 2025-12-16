export default function MRDPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Imprinta</h1>
          <p className="text-sm text-slate-400">MRD wizard (demo)</p>
        </div>

        <button className="rounded-full border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900/40">
          Patients
        </button>
      </header>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6">
        MRD Wizard UI will be here (tree + details).
      </div>
    </div>
  );
}