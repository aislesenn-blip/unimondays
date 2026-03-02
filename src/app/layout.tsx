import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "Playbook | EdTech Platform",
  description: "AI-Powered EdTech Platform for Teachers and Students",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans min-h-screen bg-slate-50 text-slate-900 selection:bg-slate-200`}>
        {children}
      </body>
    </html>
  );
}
