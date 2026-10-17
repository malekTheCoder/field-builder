import type { Metadata } from 'next';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import 'katex/dist/katex.min.css';
import './globals.css';
import '../src/static-fonts.css';

// One family outside the maths, Hanken Grotesk, self-hosted from the same package the static site loads
// (src/main.tsx), so the two entries set the same face; the maths keeps KaTeX's serif, and the symbols
// drawn on the figure keep Source Serif.

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
// With no choice saved it follows the system's theme, as the Explorer does: a student on a phone set to dark met a
// white page until they found the moon. Storage that cannot be read is no choice, and the system decides.
// The theme-color tags tint a phone's browser bar to match the page's ground in either theme.
const EARLY_THEME = "(function(){var d;try{d=JSON.parse(localStorage.getItem('field-builder:explorer:v1')||'{}').dark}catch(e){}try{if(d===true||typeof d!=='boolean'&&matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark')}catch(e){}})()";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f2f2f2" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#101010" />
        <script dangerouslySetInnerHTML={{ __html: EARLY_THEME }} />
      </head>
      <body className="antialiased">
        {/* Every figure is drawn by script: with it turned off the page said nothing at all. */}
        <noscript><p style={{margin: 0, padding: 16}}>Field Builder draws its figures with JavaScript, which this browser has turned off. Turn it on in the browser’s settings and reload the page.</p></noscript>
        {children}
      </body>
    </html>
  );
}
