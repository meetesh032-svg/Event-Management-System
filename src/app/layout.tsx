import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AIChatbotModal } from "@/components/AIChatbotModal";

export const metadata: Metadata = {
  title: "Gatherly - Modern Event Ticketing & Management",
  description: "Discover, create, and book events with secure ticketing and interactive seat maps.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Navbar />
        <main>{children}</main>
        <AIChatbotModal />
      </body>
    </html>
  );
}
