# How to add a Gauss's law lesson

The Gauss section is planned as eleven lessons (`GAUSS` in `src/explorer/lessons.tsx`, in the order of
[gauss-law-plan.md](gauss-law-plan.md)). Two are built: **Symmetry first** (`?g=symmetry`) and **Flux, the idea**
(`?g=flux`). They are the worked examples for the other nine. Read the plan's section "What the owner's Gauss's Law
Study Lab adds" and the study guide itself (`.claude/loop/references/gauss-study-lab.txt` in the main checkout,
git-excluded) before writing one: match its teaching order, its recipe, its traps and its checklist, in original
words, never its text or its textbook problems. It writes surface density η; this site writes σ.

## What a lesson is

One file, `src/gauss/lessons/<id>.ts`, exporting `lesson: GaussLesson` (`src/gauss/types.ts`). It is found by
`src/gauss/index.ts` through `import.meta.glob`, so nothing else is edited to add it except the readiness switch.
`<id>` is one of the `GaussId`s, which are the keys of the planned list.

```ts
type GaussLesson = {
  id: GaussId; title: string; short: string;
  about: string;                 // one sentence, home page and library
  lead: string;                  // always on the page; one or two sentences
  sections: LessonSection[];     // "Read the lesson": headings, paragraphs ($…$ symbols), {tex} displays
  read: Reading[];               // OpenStax UP2 ch. 6 §6.x with URLs, Griffiths §2.2, Purcell ch. 1 or 2
  cases: GaussCase[];            // one, or several the reader picks between
  traps: Trap[];                 // {wrong, right}: the misconceptions, shown as "Easy to confuse with"
  instrument?: 'symmetry' | 'flux' | 'profile' | 'cavity' | 'inside' | 'qenc' | 'plot';
  next?: GaussId;                // the Next card, when that lesson is ready
  related?: {field: ProblemId; text: string};  // else the related integral lesson
};
type GaussCase = {
  key: string; label: string;    // label is the picker's word ("Sphere", "Line", "Plane")
  figure: {charge: {kind, size, symbol, name}, surface: {kind, size: {min, max, initial}, other, label}};
  setup: string;                 // "The problem", top of the board
  symmetry: BoardBeat; surface: BoardBeat; left: BoardBeat; right: BoardBeat;
  solve: BoardBeat & {answer: string};
  checks: Check[];               // {title, text, tex?}: limits, continuity, the σ/ε₀ jump, what cancels
};
type BoardBeat = {tex: string; say?: string; line: string; caption: string};
```

Each beat is one stage of the run and one line of the board:

| field | where it shows | rules |
|---|---|---|
| `tex` | the board's line for the stage, and the transport's algebra on narrow screens | KaTeX, `strict` |
| `say` | under the board's line: what its new symbols mean | prose, symbols as `$…$` |
| `line` | the transport's sentence while the stage plays | one sentence, under ninety characters |
| `caption` | read to a screen reader when the run holds | plain words, **no digits** (write "four π r squared") |

The five stages are always **Symmetry, The surface, Left side, Right side, Solve** (`src/gauss/run.ts`). Left side is
where the flux integral collapses to E times an area (`E_r(4πr²)`, `E_r(2πrL)`, `2E_⊥A`); Right side is Q_enc, with
its density integral when there is one (write the integral, `\int_0^r\rho(r')\,4\pi r'^2\,dr'`, on that line).

## The figure

The figure draws itself from the case: `figure.charge.kind` is one of `point | shell | ball | line | sheet | slab`,
or `offset` (a point charge a distance `size` up the axis from the sphere's centre, inside or outside it: the run then
ends on a flux and draws no field at P), `rising` and `falling` (balls with ρ ∝ r and ρ ∝ 1 − r/R) and `tent` (a slab
with ρ ∝ 1 − |z|/a) (`size` is R for a shell or a ball, the half-thickness a for a slab), and `figure.surface.kind` is
`sphere | cylinder | pillbox`. The slider moves a sphere's or a cylinder's radius, or a pillbox's face height;
`other` is the fixed dimension (a cylinder's half-length, a pillbox's face radius). The surface is placed centred on
the charge, or straddling the sheet.

Everything it draws comes from `src/gauss/physics.ts` (exact fields, `enclosedCharge`, `patches`, `solvedField`) through
`src/gauss/scene.ts` (the plan: patches in the run's order, the zero patches last, P, the named patch). The 3D scene is
`GaussScene.tsx` (three.js, loaded on demand, the integral lessons' ortho camera and view cube); the cross-section is
drawn in SVG in `GaussFigure.tsx`. A new charge kind or surface means a case in `fieldAt`, `enclosedCharge` and the
body in `GaussScene`'s `rebuild`, and a cross-section shape in `Flat`. Physics is exact or it does not ship:
`tests/gauss-physics.test.ts` holds every case against a numerical flux integral, both signs, at the slider's ends.

Inside a ball the field grows as r; a case that lets the surface go inside a charge must say so in its right side
(`Q_enc = Q r³/R³`) and its checks (continuity at R). Symmetry first keeps the sphere outside the ball on purpose.

## Worked example 1: Symmetry first (`src/gauss/lessons/symmetry.ts`)

Three cases, one per usable symmetry: a uniform ball in a concentric sphere, an infinite line in a coaxial
cylinder, an infinite sheet in a pillbox. The picker above the sliders, and the instrument under them, switch the
case, and the run follows the case on screen. The checks include "The integral agrees" (the integral lessons'
`2kλ/r` and `σ/2ε₀`) and, for the sheet, the jump of `σ/ε₀`. Its instrument is `SymmetryTest.tsx`: propose a field,
apply a move that leaves the charge unchanged (`MOVES` in `src/gauss/instruments.ts`), see whether the carried field
lands on itself. Only "straight out" survives every move; the unit test checks that for both signs.

## Worked example 2: Flux, the idea (`src/gauss/lessons/flux.ts`)

One case, a point charge in a sphere; the run ends on `Φ = q/ε₀` and says the r² cancels. The board's answer box says
"the flux" (`GaussBoard`'s `flux` flag, set for this id). Its instrument is `FluxInstrument.tsx`: a flat patch turned
through θ from the normal, and a lumpy closed surface with four charges of either sign to drag (or move with the arrow
keys). The readout is symbolic, `\Phi=\frac{q_1+q_3}{\varepsilon_0}`, built by `fluxTex`, and changes only when a charge
crosses; `starFlux` checks it by quadrature through the same surface.

## Publishing it

1. Write `src/gauss/lessons/<id>.ts`.
2. Add `<id>` to `GAUSS_READY` in `src/problems/readiness.ts`. The lesson list, the library and the home page then
   show it as a link to `?g=<id>`; the rest stay "Coming soon".
3. Point the previous lesson's `next` at it if it was not already.
4. Add its quiz bank later under `src/quiz/` (the quiz has no Gauss banks yet).

## Tests to run

```
npx tsc --noEmit && npx oxlint
npx vitest run --project unit            # includes tests/gauss-lessons.test.ts and tests/gauss-physics.test.ts
npx vitest run --project browser tests/gauss.browser.test.tsx tests/gauss-soon.browser.test.tsx tests/home.browser.test.tsx \
  tests/a11y.browser.test.tsx tests/r1-explorer-first-screen.browser.test.tsx tests/lesson-links.browser.test.tsx
```

`tests/gauss-lessons.test.ts` holds every lesson file to the house rules automatically: KaTeX sets, no numerals in
words or captions, no em dash, five stages with short lines, a read list with OpenStax ch. 6 and Griffiths.
`tests/gauss-soon.browser.test.tsx` and `tests/gauss-lessons.test.ts` list the ready ids: update them with
`GAUSS_READY`. Browser tests that drive the run hand it frames (`frames()` in `tests/gauss.browser.test.tsx`), so
they do not depend on the machine's speed; anything over about 1.5 s locally needs an explicit timeout (CI runs
about 6.5 times slower).

After writing teaching content, run the two adversarial physics reviewers (algebra and narration; the figure)
before publishing, and screenshot both themes at 1440 and 390 with the styled config.

## House rules, in short

- No numerals as values on the page; structural constants inside TeX are fine.
- No em dashes anywhere under `src` (`tests/no-em-dash.test.ts`).
- Every sentence true for either sign: E_r and E_⊥ are signed components, "negative where the field points in".
- σ for surface density, never η.
- Keyboard for every drag, screen-reader names, Reduce Motion steps the run and never skips it.
