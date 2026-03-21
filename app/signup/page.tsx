import Link from "next/link";
import { redirect } from "next/navigation";

import { signupAction } from "@/app/actions/auth";
import { auth } from "@/auth";

type SignupPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? decodeURIComponent(params.error) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Create account</h1>
      <p className="text-sm text-zinc-600">Start building your subject tree and study workflow.</p>

      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <form action={signupAction} className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Name</span>
          <input
            required
            name="name"
            className="rounded-md border border-zinc-300 px-3 py-2"
            placeholder="Your name"
            minLength={2}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Email</span>
          <input
            required
            name="email"
            type="email"
            className="rounded-md border border-zinc-300 px-3 py-2"
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Password</span>
          <input
            required
            name="password"
            type="password"
            className="rounded-md border border-zinc-300 px-3 py-2"
            placeholder="At least 8 characters"
            minLength={8}
          />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Create account
        </button>
      </form>

      <p className="text-sm text-zinc-600">
        Already have an account?{" "}
        <Link className="font-medium text-zinc-900 underline" href="/login">
          Sign in
        </Link>
      </p>
    </main>
  );
}
