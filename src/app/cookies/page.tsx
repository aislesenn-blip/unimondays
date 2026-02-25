import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground">
      <Navbar />
      <main className="flex-1 pt-24 px-6 md:px-12 max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">Cookie Policy</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. What Are Cookies?</h2>
          <p className="leading-relaxed">
            Cookies are small text files that are placed on your device when you visit our website. They help us provide you with a better experience and allow certain features of the platform to function correctly.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. How We Use Cookies</h2>
          <p className="leading-relaxed">
            We use cookies for the following purposes:
          </p>
          <ul className="list-disc pl-5 space-y-2 leading-relaxed">
            <li><strong>Essential Cookies:</strong> These are necessary for the website to function (e.g., managing your login session).</li>
            <li><strong>Performance Cookies:</strong> These help us understand how users interact with our website, allowing us to improve performance.</li>
            <li><strong>Functional Cookies:</strong> These allow the website to remember choices you make (such as your language or region).</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Managing Cookies</h2>
          <p className="leading-relaxed">
            Most web browsers automatically accept cookies, but you can usually modify your browser settings to decline cookies if you prefer. However, this may prevent you from taking full advantage of the website.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Contact Us</h2>
          <p className="leading-relaxed">
            If you have any questions about our Cookie Policy, please contact us at <strong>0745780988</strong>.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
