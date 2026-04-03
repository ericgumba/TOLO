import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Tolo",
  description: "Privacy Policy for Tolo.",
};

export default async function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Legal</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
        <p className="text-base leading-7 text-slate-600">
          Effective Date: 03/02/2026
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">1. Overview</h2>
        <p className="text-base leading-7 text-slate-700">
          This Privacy Policy explains how Tolo (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses,
          and protects your information.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">2. Information We Collect</h2>
        <h3 className="text-lg font-semibold text-slate-900">a. Information You Provide</h3>
        <ul className="list-disc space-y-2 pl-6 text-base leading-7 text-slate-700">
          <li>Email address.</li>
          <li>Account credentials (stored as hashed passwords).</li>
          <li>Questions, answers, and learning content you submit.</li>
        </ul>
        <h3 className="text-lg font-semibold text-slate-900">b. Automatically Collected Data</h3>
        <ul className="list-disc space-y-2 pl-6 text-base leading-7 text-slate-700">
          <li>Usage data, such as interactions and features used.</li>
          <li>Device and browser information.</li>
          <li>Log data, including IP address and timestamps.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">3. How We Use Your Information</h2>
        <p className="text-base leading-7 text-slate-700">We use your data to:</p>
        <ul className="list-disc space-y-2 pl-6 text-base leading-7 text-slate-700">
          <li>Provide and operate the Service.</li>
          <li>Generate AI-based feedback and grading.</li>
          <li>Improve the product and user experience.</li>
          <li>Monitor performance and prevent abuse.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">4. AI Processing</h2>
        <p className="text-base leading-7 text-slate-700">
          Your inputs, including answers and questions, may be processed by third-party AI providers to generate
          responses.
        </p>
        <p className="text-base leading-7 text-slate-700">
          These providers may temporarily process your data to produce outputs.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">5. Third-Party Services</h2>
        <p className="text-base leading-7 text-slate-700">We use third-party services, including:</p>
        <ul className="list-disc space-y-2 pl-6 text-base leading-7 text-slate-700">
          <li>Cloud infrastructure, such as AWS.</li>
          <li>Database providers, such as PostgreSQL.</li>
          <li>Payment processors, such as Stripe, if applicable.</li>
          <li>AI providers, such as OpenAI or similar providers.</li>
        </ul>
        <p className="text-base leading-7 text-slate-700">
          These services may process your data on our behalf.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">6. Data Retention</h2>
        <p className="text-base leading-7 text-slate-700">
          We retain your data as long as your account is active or as needed to provide the Service.
        </p>
        <p className="text-base leading-7 text-slate-700">
          We may delete or anonymize data when it is no longer needed.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">7. Your Rights (California Residents)</h2>
        <p className="text-base leading-7 text-slate-700">
          If you are a California resident, you have the right to request access to your data and request deletion of
          your data.
        </p>
        <p className="text-base leading-7 text-slate-700">
          To make a request, contact{" "}
          <a className="font-medium text-slate-900 underline" href="mailto:support@toloapp.com">
            support@toloapp.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">8. Data Security</h2>
        <p className="text-base leading-7 text-slate-700">We take reasonable measures to protect your data.</p>
        <p className="text-base leading-7 text-slate-700">However, no system is completely secure.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">9. Cookies</h2>
        <p className="text-base leading-7 text-slate-700">We use cookies to maintain login sessions and improve user experience.</p>
        <p className="text-base leading-7 text-slate-700">By using the Service, you consent to cookie usage.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">10. Children&apos;s Privacy</h2>
        <p className="text-base leading-7 text-slate-700">We do not knowingly collect data from children under 13.</p>
        <p className="text-base leading-7 text-slate-700">
          If we become aware of such data, we will delete it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">11. Changes to This Policy</h2>
        <p className="text-base leading-7 text-slate-700">
          We may update this Privacy Policy at any time. Continued use of the Service means you accept the updated
          policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">12. Contact</h2>
        <p className="text-base leading-7 text-slate-700">
          For privacy-related questions or requests, contact{" "}
          <a className="font-medium text-slate-900 underline" href="mailto:support@toloapp.com">
            support@toloapp.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
