import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Tolo",
  description: "Terms of Service for using Tolo.",
};

export default async function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Legal</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Terms of Service</h1>
        <p className="text-base leading-7 text-slate-600">
          Effective Date: 03/02/2026
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">1. Overview</h2>
        <p className="text-base leading-7 text-slate-700">
          Welcome to Tolo (&quot;Service&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By accessing or
          using the Service, you agree to these Terms of Service (&quot;Terms&quot;).
        </p>
        <p className="text-base leading-7 text-slate-700">If you do not agree, do not use the Service.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">2. Description of Service</h2>
        <p className="text-base leading-7 text-slate-700">
          Tolo is an educational platform that allows users to create and organize topics and questions, answer
          questions, and receive automated feedback and grading powered by AI.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">3. Eligibility</h2>
        <p className="text-base leading-7 text-slate-700">
          You must be at least 13 years old to use this Service.
        </p>
        <p className="text-base leading-7 text-slate-700">
          By using the Service, you represent that you meet this requirement and have the legal capacity to agree to
          these Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">4. User Accounts</h2>
        <p className="text-base leading-7 text-slate-700">
          You are responsible for maintaining the confidentiality of your account and for all activity under your
          account.
        </p>
        <ul className="list-disc space-y-2 pl-6 text-base leading-7 text-slate-700">
          <li>You agree not to share your account.</li>
          <li>You agree not to use another user&apos;s account without permission.</li>
          <li>We reserve the right to suspend or terminate accounts at our discretion.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">5. Acceptable Use</h2>
        <p className="text-base leading-7 text-slate-700">You agree not to:</p>
        <ul className="list-disc space-y-2 pl-6 text-base leading-7 text-slate-700">
          <li>Use the Service for illegal purposes.</li>
          <li>Attempt to reverse engineer or abuse the system.</li>
          <li>Submit harmful, abusive, or malicious content.</li>
          <li>Attempt to manipulate or exploit AI responses.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">6. AI-Generated Content Disclaimer</h2>
        <p className="text-base leading-7 text-slate-700">
          The Service uses artificial intelligence to generate feedback and responses.
        </p>
        <p className="text-base leading-7 text-slate-700">You acknowledge that:</p>
        <ul className="list-disc space-y-2 pl-6 text-base leading-7 text-slate-700">
          <li>AI responses may be inaccurate or incomplete.</li>
          <li>The Service is provided for educational purposes only.</li>
          <li>It is not a substitute for professional advice.</li>
        </ul>
        <p className="text-base leading-7 text-slate-700">You are responsible for verifying any information.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">7. User Content</h2>
        <p className="text-base leading-7 text-slate-700">
          You retain ownership of content you submit, including answers and questions.
        </p>
        <p className="text-base leading-7 text-slate-700">
          By submitting content, you grant us a license to store, process, analyze, and use that content to improve
          the Service.
        </p>
        <p className="text-base leading-7 text-slate-700">We may remove content at our discretion.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">8. Payments and Subscriptions (if applicable)</h2>
        <p className="text-base leading-7 text-slate-700">If you purchase a subscription:</p>
        <ul className="list-disc space-y-2 pl-6 text-base leading-7 text-slate-700">
          <li>Payments are billed in advance.</li>
          <li>Subscriptions renew automatically unless canceled.</li>
          <li>You can cancel at any time.</li>
        </ul>
        <p className="text-base leading-7 text-slate-700">
          We do not guarantee refunds unless required by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">9. Termination</h2>
        <p className="text-base leading-7 text-slate-700">
          We may suspend or terminate your account if you violate these Terms or abuse the Service.
        </p>
        <p className="text-base leading-7 text-slate-700">You may stop using the Service at any time.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">10. Disclaimer of Warranties</h2>
        <p className="text-base leading-7 text-slate-700">
          The Service is provided &quot;as is&quot; without warranties of any kind.
        </p>
        <p className="text-base leading-7 text-slate-700">We do not guarantee:</p>
        <ul className="list-disc space-y-2 pl-6 text-base leading-7 text-slate-700">
          <li>Accuracy of AI responses.</li>
          <li>Continuous availability.</li>
          <li>Error-free operation.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">11. Limitation of Liability</h2>
        <p className="text-base leading-7 text-slate-700">To the maximum extent permitted by law, we are not liable for:</p>
        <ul className="list-disc space-y-2 pl-6 text-base leading-7 text-slate-700">
          <li>Indirect or consequential damages.</li>
          <li>Loss of data.</li>
          <li>Reliance on AI-generated content.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">12. Changes to Terms</h2>
        <p className="text-base leading-7 text-slate-700">
          We may update these Terms at any time. Continued use of the Service means you accept the updated Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">13. Contact</h2>
        <p className="text-base leading-7 text-slate-700">
          For questions, contact <a className="font-medium text-slate-900 underline" href="mailto:support@toloapp.com">support@toloapp.com</a>.
        </p>
      </section>
    </main>
  );
}
