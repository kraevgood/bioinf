import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});


export const metadata: Metadata = {
  title: "Imprinta | Workflow",
  description:
    "Interactive bioinformatics workflow for MRD analysis: tumor-informed and indication-based pipelines, FASTQ upload, imprint generation and plasma sample processing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}