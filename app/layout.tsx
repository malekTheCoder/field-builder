import type { Metadata } from 'next';
import { Geist, Geist_Mono, Source_Serif_4 } from 'next/font/google';
import 'katex/dist/katex.min.css';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Headings and prose sit next to KaTeX's Computer Modern all over this app. A
// text serif belongs in that company; the sans defaults did not.
const serif = Source_Serif_4({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'Field Builder — Electric fields and potential, derived',
  description: 'Build electric-field and electric-potential integrals one step at a time. An open visual workbench with 15 lessons, including electric potential, animated SVG, continuous integrals, and physical sanity checks.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
