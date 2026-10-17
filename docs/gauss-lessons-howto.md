# How to add a Gauss's law lesson

All eleven Gauss lessons are implemented and ready (`GAUSS` in `src/explorer/lessons.tsx`, in the order of
[gauss-law-plan.md](gauss-law-plan.md)). **Symmetry first** (`?g=symmetry`) and **Flux, the idea**
(`?g=flux`) are the worked authoring examples below; the other nine lessons are in `src/gauss/lessons/`. Read the plan's section "What the owner's Gauss's Law
Study Lab adds" and the study guide itself (`.claude/loop/references/gauss-study-lab.txt` in the main checkout,
git-excluded) before writing one: match its teaching order, its recipe, its traps and its checklist, in original
words, never its text or its textbook problems. It writes surface density η; this site writes σ.

## What a lesson is

One file, `src/gauss/lessons/<id>.ts`, exporting `lesson: GaussLesson` (`src/gauss/types.ts`). It is found by
`src/gauss/index.ts` through `import.meta.glob`, so nothing else is edited to add it except the readiness switch.
`<id>` is one of the `GaussId`s, which are the keys of the lesson catalogue.

```ts
type GaussLesson = {
  id: GaussId; title: string; short: string;
  about: string;                 // one sentence, home page and library
  lead: string;                  // always on the page; one or two sentences
  sections: LessonSection[];     // "Read the lesson": headings, paragraphs ($…$ symbols), {tex} displays
  read: Reading[];               // OpenStax UP2 ch. 6 §6.x with URLs, Griffiths §2.2, Purcell ch. 1 or 2, Knight ch. 27
  cases: GaussCase[];            // one, or several the reader picks between
  traps: Trap[];                 // {wrong, right}: the misconceptions, shown as "Easy to confuse with"
  instrument?: 'symmetry' | 'flux' | 'profile' | 'cavity' | 'inside' | 'qenc' | 'plot' | 'hole' | 'cube';
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

The last three lessons added: a charge with a `hole` (`ballhole`, `rodhole`, `sheethole`), drawn as its two pieces,
each round its own surface through P, the two fields added at P (`Built.pieces`, `chainOf`); `segment` (a finite rod)
and a `point` given an `at`, in a `cube` surface, where `throughPatch` integrates each patch exactly and the run ends on
the flux; `halo`, `cusp` and `oddslab`, the last with a pillbox whose bottom face is fixed below the slab
(`figure.surface.low`). An `amount` scales a charge so a lesson's cases share one arrow scale; `figure.surface.cut`
cuts a surface finer; `solve.label` renames the answer box; `onward: 'home'` ends the section on a card home. The
instruments `hole` (HoleInstrument) and `cube` (CubeInstrument) are new.

Everything it draws comes from `src/gauss/physics.ts` (exact fields, `enclosedCharge`, `patches`, `solvedField`) through
`src/gauss/scene.ts` (the plan: patches in the run's order, the zero patches last, P, the named patch). The 3D scene is
`GaussScene.tsx` (three.js, loaded on demand, the integral lessons' ortho camera and view cube); the cross-section is
drawn in SVG in `GaussFigure.tsx`. A new charge kind or surface means a case in `fieldAt`, `enclosedCharge` and the
body in `GaussScene`'s `rebuild`, and a cross-section shape in `Flat`. Physics is exact or it does not ship:
`tests/gauss-physics.test.ts` holds every case against a numerical flux integral, both signs, at the slider's ends.

Inside a uniformly charged ball the signed radial field is proportional to r; a case that lets the surface go inside a charge must say so in its right side
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
   show it as a link to `?g=<id>`; the rest stay "Coming soon". A link may name a case and a stage of Watch it
   build, `?g=<id>&case=<key>&stage=<symmetry|surface|left|right|solve>` (or `stage=1` to `5`): the page opens on
   that case with the run held on that stage, writes what is on screen back into the address as it changes, and
   the quiz's review links use it (`place()` in `src/quiz/engine.ts`). So a case's `key` is part of its address:
   renaming one breaks the links to it.
3. Point the previous lesson's `next` at it if it was not already.
4. Add its quiz bank, `src/quiz/bank/gauss-<id>.ts`: [quiz-plan.md](quiz-plan.md), "Adding a Gauss bank", says how.

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
- σ for surface density. η appears only to say that Knight (the course's book) writes it for σ.
- "Perpendicular to", never "square to". Name the closed surface a Gaussian surface where it is first drawn.
- Peak, grows, falls, below are sign words: with a signed quantity, say "its size peaks".
- One symbol per quantity across the section: r is the distance from a centre or an axis, with E_r along r̂.
- A piece defined with its sign (a plug of −ρ) is always added: "plus the plug's", never "less the plug's".
- Board TeX is symbols. Put words in `say`; where a line needs words, break it with `aligned` so it fits the board.
- `line` is said aloud through `spoken()` (`src/gauss/run.ts`); `tests/gauss-lessons.test.ts` fails on any TeX left
  in it, so a new command in a line needs a symbol in `SYMBOLS` there.
- Keyboard for every drag, screen-reader names, Reduce Motion steps the run and never skips it.
