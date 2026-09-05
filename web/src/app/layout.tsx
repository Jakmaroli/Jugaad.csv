import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IR Block Planning Cockpit | SIH26027 Decision Support System",
  description:
    "AI-Assisted Corridor Block Planning and Possession Optimization System for Indian Railways (Ministry of Railways / SIH26027).",
  keywords: [
    "Indian Railways",
    "Smart India Hackathon",
    "SIH26027",
    "Block Planning",
    "CP-SAT",
    "COA",
    "BDMS",
    "Decision Support System",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
