import Link from "next/link";

type QuizHeaderProps = {
  from: string;
  nodeTitle: string;
  nodeLevel: string;
};

export function QuizHeader({ from, nodeTitle, nodeLevel }: QuizHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quiz : {nodeTitle}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Question</h1>
        <p className="mt-1 text-sm text-slate-500">Level: {nodeLevel.toLowerCase()}</p>
      </div>
      <Link href={from} className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100">
        Back
      </Link>
    </header>
  );
}
