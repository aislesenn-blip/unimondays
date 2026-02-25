import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground">
      <Navbar />
      <main className="flex-1 pt-24 px-6 md:px-12 max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
          <p className="leading-relaxed">
            By accessing or using the Playbook Ecosystem platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. User Accounts</h2>
          <p className="leading-relaxed">
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Academic Integrity</h2>
          <p className="leading-relaxed">
            Users agree to use the platform in a manner consistent with academic integrity standards. Any attempt to manipulate grades, bypass security measures, or submit fraudulent work will result in immediate account suspension and reporting to the relevant institution.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Intellectual Property</h2>
          <p className="leading-relaxed">
            All content, features, and functionality of the platform are owned by Playbook Ecosystem and are protected by international copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Limitation of Liability</h2>
          <p className="leading-relaxed">
            In no event shall Playbook Ecosystem be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the platform.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Changes to Terms</h2>
          <p className="leading-relaxed">
            We reserve the right to modify these terms at any time. We will notify users of any material changes via email or platform notification.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Contact Us</h2>
          <p className="leading-relaxed">
            If you have any questions about these Terms, please contact us at <strong>0745780988</strong>.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
