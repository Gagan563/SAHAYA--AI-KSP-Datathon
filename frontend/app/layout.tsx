import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SAHAYA AI — KSP Crime Intelligence Platform",
  description:
    "Conversational crime analytics assistant for Karnataka State Police. Suspect network analysis, hotspot detection, and multilingual voice input powered by Zoho Catalyst.",
  keywords: ["KSP", "crime intelligence", "SAHAYA", "Karnataka Police", "analytics"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-[var(--color-bg-primary)]">
        <Sidebar />
        <main className="flex-1 ml-64 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
