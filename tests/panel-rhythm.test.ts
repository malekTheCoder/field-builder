import {describe, expect, it} from 'vitest';
import katex from 'katex';
import {PROBLEMS} from '../src/problems/definitions';
import {ARC_UNFOLD, AXIAL_UNFOLD, BISECTOR_UNFOLD, DISK_UNFOLD, ENDPOINT_UNFOLD, INFINITE_UNFOLD, SEMI_UNFOLD, resultLines} from '../src/workbench/derivation';
/* THE ANSWER'S ROWS ARE SET A GAP APART, NOT A TOWER OF FRACTIONS.
 *
 * Every result of more than one row is one aligned block, written with one \\[.45em] between rows. KaTeX
 * reads \\[g] as "make this row at least g + .36em deep", and a row whose fraction has a radical under its
 * bar is already about an em deep: the gap added nothing, and the bisector's λ row sat 5 px above its Q
 * row while the board's own chain just above was 18 px apart.
 *
 * So this measures, in KaTeX's own metrics, the white between one row's ink and the next's: how deep and
 * tall KaTeX made each row of the laid-out table, less how deep and tall that row's content is set alone.
 * Nothing about KaTeX's array rule is restated here -- the row boxes are KaTeX's. A row that continues the
 * expression above it (the ramp's bracket, the disk's "(z > 0)") keeps the plain line spacing; every row
 * that starts a new equality stands a clear gap below the last. */
type Box = {classes?: string[]; children?: Box[]; height?: number; depth?: number};
const tree = (tex: string) => (katex as unknown as {__renderToHTMLTree: (t: string, o: object) => Box}).__renderToHTMLTree(tex, {displayMode: true, throwOnError: true, strict: 'ignore'});
function find(n: Box, cls: string): Box | undefined {
  if (n.classes?.includes(cls)) return n;
  for (const c of n.children ?? []) { const f = find(c, cls); if (f) return f; }
}
/** The white between consecutive rows of an aligned block, in em, and whether each row opens a new equality. */
function whites(tex: string) {
  const body = tex.replace(/^\\begin\{aligned\}|\\end\{aligned\}$/g, '');
  const rows = body.split(/\\\\(?:\[[^\]]*\])?/);
  // The rows as KaTeX laid them out: it gives every cell its row's height and depth, the gap and the
  // line spacing included.
  const column = find(tree(tex), 'mtable')!.children!.find(c => c.classes?.some(k => k.startsWith('col-align')))!;
  const laid = find(column, 'vlist')!.children!.map(w => w.children![1]);
  expect(laid, tex).toHaveLength(rows.length);
  // Each row's own ink: its content set alone, in display style, as aligned sets its cells.
  const own = rows.map(r => tree(r.replace(/&/g, '')));
  return rows.slice(1).map((row, i) => ({
    row, opens: /^(E_[xyz]|\|\\mathbf E\||V)?&=/.test(row),
    white: (laid[i].depth! - own[i].depth!) + (laid[i + 1].height! - own[i + 1].height!),
  }));
}
const aligned = (tex: string) => tex.startsWith('\\begin{aligned}');

describe('the answer in one rhythm', () => {
  it('every new equality in an answer stands about .7em below the row above it; a continuation keeps the line spacing', () => {
    const bad: string[] = [];
    let seen = 0;
    for (const p of PROBLEMS) for (const tex of resultLines(p).filter(aligned)) for (const {row, opens, white} of whites(tex)) {
      seen++;
      if (opens ? white < .55 || white > .85 : white < .2 || white > .5) bad.push(`${p.id}: ${white.toFixed(2)}em above "${row.slice(0, 40)}"`);
    }
    expect(seen).toBeGreaterThan(12);
    expect(bad).toEqual([]);
  });
  it('the same in the panel’s own worked steps', () => {
    const bad: string[] = [];
    for (const [name, steps] of Object.entries({BISECTOR_UNFOLD, ENDPOINT_UNFOLD, INFINITE_UNFOLD, SEMI_UNFOLD, DISK_UNFOLD, ARC_UNFOLD, AXIAL_UNFOLD}))
      for (const s of steps.filter(x => aligned(x.tex))) for (const {row, white} of whites(s.tex))
        if (white < .55 || white > .85) bad.push(`${name}: ${white.toFixed(2)}em above "${row.slice(0, 40)}"`);
    expect(bad).toEqual([]);
  });
  it('the old single gap was the tower of fractions it is said to be', () => {
    // The bisector's two rows with \\[.45em]: the line spacing alone, under a third of an em.
    const old = String.raw`\begin{aligned}E_x&=\frac{k\lambda L}{r\sqrt{(L/2)^2+r^2}}\\[.45em]&=\frac{kQ}{r\sqrt{(L/2)^2+r^2}}\end{aligned}`;
    expect(whites(old)[0].white).toBeLessThan(.35);
  });
});
