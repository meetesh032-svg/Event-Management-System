import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AIChatbotModal } from "@/components/AIChatbotModal";

export const metadata: Metadata = {
  title: "Gatherly - Discover Movies, Concerts, Events & Sports Tickets",
  description: "India's premier entertainment destination. Book movie tickets, live concerts, stand-up comedy, sports, and theatre with interactive seat selection.",
  keywords: ["event booking", "movie tickets", "concert tickets", "sports tickets", "live events", "gatherly", "seat selection"],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-gray-50 text-gray-900 antialiased selection:bg-[#F84464] selection:text-white">
        <Navbar />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
        <AIChatbotModal />
      </body>
    </html>
  );
}
