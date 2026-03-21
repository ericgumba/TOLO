import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { logoutAction } from "@/app/actions/auth";

export default async function Home() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
          Learn Better
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900">
          Build your study tree with TOLO
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build your own subject tree and study from it. Milestone 1 includes authentication, dashboard,
          and subject/topic/subtopic CRUD.
        </p>

        {session?.user?.id ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Open Dashboard
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sign in
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
