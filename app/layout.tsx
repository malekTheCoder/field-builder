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
  // What a link preview shows under a shared lesson -- in Google Classroom, in a chat -- so it is
  // written for the student who will see it: no count (the page prints no numerals) and no jargon.
  description: 'Build the electric field and potential of rods, rings, disks and sheets one step at a time: cut the charge into pieces, add their fields, and watch the sum become the integral.',
};

// THE SAVED THEME, BEFORE THE FIRST PAINT. It was applied by the Explorer once React had mounted and read
// storage, so a reader working in the dark theme saw the light ground on every load and every shared link --
// a flash in a dark room -- for as long as the bundle took to arrive and run. This reads the same saved
// setting (Explorer.tsx, STORAGE) before the body is drawn; the Explorer's own effect then only confirms it.
// index.html, the static entry the site is published from, carries the same line.
const EARLY_THEME = "try{if(JSON.parse(localStorage.getItem('field-builder:explorer:v1')||'{}').dark===true)document.documentElement.classList.add('dark')}catch(e){}";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: EARLY_THEME }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
