import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground">
      <Navbar />
      <main className="flex-1 pt-24 px-6 md:px-12 max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Introduction</h2>
          <p className="leading-relaxed">
            Playbook Ecosystem ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share your personal information when you use our platform.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2 leading-relaxed">
            <li><strong>Account Information:</strong> Name, email address, institution, and role (Student or Lecturer).</li>
            <li><strong>Academic Data:</strong> Student submissions, grades, assessment criteria, and group memberships.</li>
            <li><strong>Usage Data:</strong> Information about how you interact with our platform, including logs and analytics.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. How We Use Your Information</h2>
          <p className="leading-relaxed">
            We use your data strictly to provide and improve our educational services. specifically for:
          </p>
          <ul className="list-disc pl-5 space-y-2 leading-relaxed">
            <li>Facilitating the submission and grading of assessments.</li>
            <li>Generating analytics and reports for educators.</li>
            <li>Managing user accounts and authentication.</li>
            <li>Ensuring academic integrity and platform security.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Data Security</h2>
          <p className="leading-relaxed">
            We implement industry-standard security measures to protect your data. All sensitive information is encrypted at rest and in transit. We do not sell your personal data to third parties.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Contact Us</h2>
          <p className="leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us at <strong>0745780988</strong>.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
