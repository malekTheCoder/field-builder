import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import {Assessment} from '../src/components/Assessment';
import {Onboarding} from '../src/components/Onboarding';
import {Laws} from '../src/components/Laws';
import {PROBLEMS, getProblem} from '../src/problems/definitions';
import {DEFAULT_PARAMS} from '../src/problems/types';
/* WAVE 1, SECOND PASS · CONTENT: THE LIMITING CASES AND THE TOUR, AS THEY RENDER.
 *
 * A phone page that scrolled sideways once Limiting cases opened; flat plots whose dashed reference
 * lay hidden under the solid curve; sliders a screen reader could not name; a thumbnail whose arrow
 * ran off its frame; a tour whose head-to-tail chain floated in a corner apart from P, whose labels
 * were seven pixels on a phone, and whose first rod lost its field as 1/r. */
afterEach(async () => { cleanup(); await page.viewport(1280, 800); });
const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
// The suite does not load the app's stylesheet; this is Tailwind's own sr-only, which the fix leans on.
const srOnly = () => { const s = document.createElement('style'); s.textContent = '.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border-width:0}'; document.head.appendChild(s); return () => s.remove(); };
describe('Limiting cases on a phone', () => {
  it('opening them does not make the page scroll sideways', async () => {
    await page.viewport(390, 844);
    const restore = srOnly();
    try {
      for (const id of ['ring', 'bisector', 'v-rod-axial']) {
        const problem = getProblem(id);
        const {unmount} = render(<div style={{padding: '0 16px'}}><Assessment problem={problem} params={DEFAULT_PARAMS} limit={problem.limits[0]} /></div>);
        await frame();
        // The data table is still there for a screen reader, hidden; it just no longer lays out
        // five hundred pixels wide in the page's flow.
        expect(document.querySelectorAll('table tbody tr').length, id).toBe(70);
        expect(document.documentElement.scrollWidth, `${id}: page width at a 390 px viewport`).toBeLessThanOrEqual(window.innerWidth);
        unmount();
      }
    } finally { restore(); }
  });
});
describe('a level reference is drawn over the curve that sits on it', () => {
  for (const [id, mode] of [['v-arc', 'full'], ['sheet', 'scale'], ['semi', 'scale'], ['infinite', 'scale'], ['ring', 'far']] as const) it(`${id}/${mode}`, () => {
    const problem = getProblem(id), limit = problem.limits.find(l => l.mode === mode)!;
    const {container} = render(<div style={{width: 560}}><Assessment problem={problem} params={DEFAULT_PARAMS} limit={limit} /></div>);
    const exact = container.querySelector('path[stroke="var(--field)"]')!, line = container.querySelector('line.comparison-reference')!;
    expect(line, 'the dashed reference').not.toBeNull();
    expect(exact.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING, 'drawn after, so on top of, the exact curve').toBeTruthy();
  });
});
describe('the preview sliders are named where a keyboard lands', () => {
  it('the limiting case’s slider', () => {
    const problem = getProblem('ring');
    const view = render(<Assessment problem={problem} params={DEFAULT_PARAMS} limit={problem.limits[0]} />);
    expect(view.getByRole('slider', {name: 'Explore limiting case'}).tagName).toBe('INPUT');
  });
  it('the tour’s sliders, page by page', async () => {
    const view = render(<Onboarding open onClose={() => {}} />);
    for (const [n, name] of [[1, 'Preview observation-point distance'], [3, 'Preview number of charge pieces'], [4, 'Preview accumulated contributions']] as const) {
      (view.baseElement.querySelector(`[aria-label="Introduction page ${n}"]`) as HTMLElement).click();
      await frame();
      expect(view.getByRole('slider', {name}).tagName, name).toBe('INPUT');
    }
  });
});
describe('the thumbnail keeps P’s arrow inside its frame', () => {
  // Drawn upright, the ring, disk and sheet put P above the source and its field ran off the top of
  // a 48-unit frame; beside a half line or a rod standing on P's level it ran off the bottom.
  it('in every field lesson, for either sign, at both ends of the sweep', async () => {
    for (const problem of PROBLEMS.filter(p => p.quantity === 'E')) for (const limit of problem.limits) for (const charge of [2, -2]) {
      const {container, getByRole, unmount} = render(<div style={{width: 560}}><Assessment problem={problem} params={{...DEFAULT_PARAMS, charge}} limit={limit} /></div>);
      const slider = getByRole('slider', {name: 'Explore limiting case'});
      for (const key of ['{Home}', '{End}']) {
        slider.focus(); await userEvent.keyboard(key);
        const svg = container.querySelector('.limit-mini svg')!, [x, y, w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number);
        for (const g of svg.querySelectorAll<SVGGElement>('.limit-arrow')) {
          const b = g.getBBox(), at = `${problem.id}/${limit.id} q=${charge} ${key}`;
          expect(b.y, at).toBeGreaterThanOrEqual(y - .5);
          expect(b.y + b.height, at).toBeLessThanOrEqual(y + h + .5);
          expect(b.x, at).toBeGreaterThanOrEqual(x - .5);
          expect(b.x + b.width, at).toBeLessThanOrEqual(x + w + .5);
        }
      }
      unmount();
    }
  }, 30000);
  it('the ring’s far case is drawn to the sweep: P at z = 2tR, still shrinking at the far end', async () => {
    for (const id of ['ring', 'disk']) {
      const problem = getProblem(id), limit = problem.limits.find(l => l.mode === 'far')!;
      const {container, getByRole, unmount} = render(<Assessment problem={problem} params={DEFAULT_PARAMS} limit={limit} />);
      const ratio = () => {
        const ring = container.querySelector('.limit-mini ellipse')!, p = container.querySelector('.limit-mini circle')!;
        return (Number(p.getAttribute('cx')) - Number(ring.getAttribute('cx'))) / Number(ring.getAttribute('ry'));
      };
      const slider = getByRole('slider', {name: 'Explore limiting case'});
      // The default position is s = 4 on a logarithmic sweep: t = 30^(3/29).
      expect(ratio(), `${id} at the default`).toBeCloseTo(2 * 30 ** (3 / 29), 3);
      slider.focus(); await userEvent.keyboard('{End}');
      expect(ratio(), `${id} at the far end`).toBeCloseTo(60, 3);
      unmount();
    }
  });
});
describe('the tour’s sum is a closed polygon at P', () => {
  const sumPage = async () => {
    const view = render(<Onboarding open onClose={() => {}} />);
    (view.baseElement.querySelector('[aria-label="Introduction page 4"]') as HTMLElement).click();
    await frame();
    return view;
  };
  it('the contributions run head to tail out of P, and the sum closes the chain', async () => {
    const view = await sumPage();
    const steps = [...view.baseElement.querySelectorAll('g.ob-piece path.ob-step')].map(p => /^M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)$/.exec(p.getAttribute('d')!)!.slice(1).map(Number));
    expect(steps[0].slice(0, 2), 'the chain starts at P').toEqual([265, 125]);
    const added = view.baseElement.querySelectorAll('g.ob-piece.is-added').length;
    const sum = /^M([\d.]+) ([\d.]+)l(-?[\d.]+) (-?[\d.]+)$/.exec(view.baseElement.querySelector('path.ob-sum')!.getAttribute('d')!)!.slice(1).map(Number);
    const head = steps[added - 1].slice(2);
    expect(sum[0] + sum[2], 'the sum ends at the head of the pieces added so far').toBeCloseTo(head[0], 1);
    expect(sum[1] + sum[3]).toBeCloseTo(head[1], 1);
  });
  it('each label sits clear of the chain and the sum', async () => {
    const view = await sumPage();
    const slider = view.getByRole('slider', {name: 'Preview accumulated contributions'});
    slider.focus(); await userEvent.keyboard('{End}'); await frame();
    const strokes = [...view.baseElement.querySelectorAll<SVGPathElement>('path.ob-step, path.ob-sum')];
    for (const label of view.baseElement.querySelectorAll<SVGTextElement>('.ob-visual text.ob-label')) {
      const b = label.getBBox();
      for (let x = b.x; x <= b.x + b.width; x += 2) for (let y = b.y; y <= b.y + b.height; y += 2)
        for (const s of strokes) expect(s.isPointInStroke(new DOMPoint(x, y)), `“${label.textContent}” overlaps a stroke at ${x.toFixed(0)}, ${y.toFixed(0)}`).toBe(false);
    }
  });
});
describe('the tour’s figure on a phone', () => {
  it('holds its labels and plus marks near ten pixels, apart and inside the figure', async () => {
    await page.viewport(390, 844);
    const view = render(<div style={{width: 318}}><Onboarding open onClose={() => {}} /></div>);
    for (const n of [1, 3, 4]) {
      (view.baseElement.querySelector(`[aria-label="Introduction page ${n}"]`) as HTMLElement).click();
      await frame(); await frame();
      const svg = view.baseElement.querySelector<SVGSVGElement>('.ob-visual svg')!, box = svg.getBoundingClientRect(), scale = box.width / 480;
      expect(box.width, 'the figure is drawn at phone width').toBeLessThan(400);
      const texts = [...svg.querySelectorAll<SVGTextElement>('text.ob-label, text.ob-plus')];
      for (const t of texts) expect(parseFloat(getComputedStyle(t).fontSize) * scale, `page ${n}: “${t.textContent}”`).toBeGreaterThanOrEqual(9.5);
      const labels = texts.filter(t => t.classList.contains('ob-label')).map(t => ({t: t.textContent, r: t.getBoundingClientRect()}));
      for (const {t, r} of labels) expect(r.left >= box.left - .5 && r.right <= box.right + .5, `page ${n}: “${t}” leaves the figure`).toBe(true);
      for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i].r, b = labels[j].r;
        expect(a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom, `page ${n}: “${labels[i].t}” runs into “${labels[j].t}”`).toBe(false);
      }
    }
  });
});
describe('the tour’s first rod loses its field as a rod does', () => {
  it('the arrow shrinks as L/(r√(r² + L²/4)), not as 1/r', async () => {
    const view = render(<Onboarding open onClose={() => {}} />);
    await frame();
    const slider = view.getByRole('slider', {name: 'Preview observation-point distance'});
    const arrow = () => {
      const d = [...view.baseElement.querySelectorAll('.ob-visual path')].map(p => p.getAttribute('d')!).find(d => /^M[\d.]+ 102h/.test(d))!;
      const [, x, h] = /^M([\d.]+) 102h([\d.]+)$/.exec(d)!.map(Number);
      return {start: x, length: h};
    };
    slider.focus(); await userEvent.keyboard('{Home}');
    const near = arrow();
    await userEvent.keyboard('{End}');
    const far = arrow();
    // The drawn rod runs from y = 35 to 168, a length of 133; P walks from r = 96 to r = 224.
    const field = (r: number) => 133 / (r * Math.sqrt(r * r + 133 * 133 / 4));
    expect(near.length / far.length).toBeCloseTo(field(96) / field(224), 2);
    expect(near.length / far.length, 'more than the 1/r law’s 2.33').toBeGreaterThan(4.5);
    // It leaves P's ring, radius 8, rather than its centre.
    expect(near.start).toBe(178 + 8);
  });
});
describe('the laws are set as displayed equations', () => {
  it('every headline law is in display style', () => {
    const {container} = render(<Laws />);
    const tex = [...container.querySelectorAll('.law-tex annotation')].map(a => a.textContent ?? '');
    expect(tex.length).toBe(3);
    for (const t of tex) expect(t).toMatch(/^\\displaystyle /);
  });
});
