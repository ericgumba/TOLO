import Link from "next/link";
import { connection } from "next/server";

import { logoutAction } from "@/app/actions/auth";
import { auth } from "@/auth";

function getDisplayName(name: string | null | undefined, email: string | null | undefined) {
  if (name?.trim()) {
    return name.trim();
  }

  if (email?.trim()) {
    return email.split("@")[0];
  }

  return "there";
}

export async function HomeBanner() {
  await connection();
  const session = await auth();
  const displayName = getDisplayName(session?.user?.name, session?.user?.email);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link className="text-xl font-bold tracking-wide text-slate-900" href="/">
          TOLO
        </Link>

        {session?.user?.id ? (
          <details className="group relative">
            <summary className="list-none cursor-pointer rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900">
              Welcome {displayName}
            </summary>
            <div className="absolute right-0 mt-2 min-w-40 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <form action={logoutAction}>
                <button
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                  type="submit"
                >
                  Logout
                </button>
              </form>
            </div>
          </details>
        ) : (
          <nav className="flex items-center text-sm font-semibold text-slate-600">
            <Link className="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900" href="/signup">
              Register
            </Link>
            <span className="px-2 text-slate-300">|</span>
            <Link className="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900" href="/login">
              Login
            </Link>
            <span className="px-2 text-slate-300">|</span>
            <Link className="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900" href="/signup?plan=premium">
              Premium
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
