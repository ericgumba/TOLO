import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

type Step = {
  step: string;
  title: string;
  body: string;
};

type Feature = {
  title: string;
  body: string;
};

const steps: Step[] = [
  {
    step: "01",
    title: "Create your study tree",
    body: "Start with one subject, then split it into topics and subtopics so your material is organized by concept instead of one long page of notes.",
  },
  {
    step: "02",
    title: "Add questions where they belong",
    body: "Attach questions directly to the subject, topic, or subtopic you want to study. Each question stays connected to the section it is testing.",
  },
  {
    step: "03",
    title: "Answer in free-form",
    body: "Open a question and explain the answer in your own words. TOLO is designed for active recall, not multiple choice guessing.",
  },
  {
    step: "04",
    title: "Review with AI and spaced repetition",
    body: "The app grades your answer, gives hints and feedback, suggests future questions, and schedules review for main questions when they are due again.",
  },
];

const features: Feature[] = [
  {
    title: "Hierarchical study structure",
    body: "Subjects, topics, and subtopics keep your questions grouped by the exact concept they belong to.",
  },
  {
    title: "Free-form quiz practice",
    body: "You learn by explaining ideas clearly, which reveals gaps that flashcards usually miss.",
  },
  {
    title: "AI tutoring loop",
    body: "Hints, grading, and generated question suggestions help you go deeper when your answer is incomplete.",
  },
  {
    title: "Review queue",
    body: "Main questions enter spaced repetition so the app brings material back when it should be revisited.",
  },
];

const workflowItems = [
  "Create a subject like Operating Systems.",
  "Add topics like Virtualization and Processes, then add subtopics where needed.",
  "Create questions for the exact node you want to practice.",
  "Open a question, answer it in free-form, and read the AI feedback.",
  "Use hints if you are stuck, then revisit due questions from the dashboard review queue.",
];

export default async function Home() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-8 lg:py-12">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="border-b border-slate-200 p-8 lg:border-b-0 lg:border-r lg:p-12">
            <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              AI study tree + review queue
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Learn with structure, active recall, and AI feedback.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              TOLO helps you build a subject tree, attach quiz questions to the right concept, answer them in
              free-form, and review them later with spaced repetition.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              It is built for studying systems, courses, and technical topics where understanding relationships
              between ideas matters as much as memorizing facts.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="bg-slate-50 p-8 lg:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">What the app does</p>
            <div className="mt-6 grid gap-4">
              {features.map((feature) => (
                <article key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-900">{feature.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">How to use TOLO</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">A quick tutorial</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            The workflow is simple: organize the material, create questions, answer honestly, then let the app decide
            what deserves more review.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {steps.map((step) => (
            <article key={step.step} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Step {step.step}</div>
              <h3 className="mt-3 text-xl font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Example session</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">What a first study session looks like</h2>
          <ol className="mt-6 grid gap-4 text-sm leading-6 text-slate-600">
            {workflowItems.map((item, index) => (
              <li key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="mr-2 font-semibold text-slate-900">{index + 1}.</span>
                {item}
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Who it is for</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Best for concept-heavy studying</h2>
          <div className="mt-6 grid gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-base font-semibold text-slate-900">Good fit</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                CS, math, science, interview prep, and any subject where topics build on each other and you need to
                explain reasoning, not just recall a definition.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-base font-semibold text-slate-900">Why it works</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The tree keeps context visible, the quizzes force explanation, and the review queue keeps you from
                forgetting material right after you learned it.
              </p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <h3 className="text-base font-semibold text-slate-900">Start here</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Create one subject, add 3 to 5 questions, and run through a single quiz session. That is enough to
                understand the full loop.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
