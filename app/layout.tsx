import type { Metadata } from 'next';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/geist-mono';
import 'katex/dist/katex.min.css';
import './globals.css';
import '../src/static-fonts.css';

// One family outside the maths, Hanken Grotesk, self-hosted from the same package the static site loads
// (src/main.tsx), so the two entries set the same face; the maths keeps KaTeX's serif.

export const metadata: Metadata = {
  title: 'Field Builder · Electric fields and potential, derived',
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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
