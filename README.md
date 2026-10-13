# Field Builder

An interactive electric-field workbench for calculus-based introductory physics (Physics 2 / AP Physics C: E&M). Students move an observation point, cut a charge distribution into elements, watch a finite sum become an integral, and check the result against a limiting case.

**Live site:** [https://field.malekswilam.dev](https://field.malekswilam.dev) — public, no student accounts.

Fifteen lessons are in the library, **all live**: ten field geometries and five potential lessons. A lesson that is not ready can be held back in `src/problems/readiness.ts`, where it stays listed under *Coming soon* rather than hidden. They are listed rather than hidden, so a reader can see the whole plan and tell the gap is deliberate; `src/problems/readiness.ts` is the only switch, and why each one is held back is written there.

## In class

Open the live site. The explorer is the whole product: a figure, the integral being assembled beside it, and controls under both. Nothing is graded and nothing is scored — the site teaches, it does not test. Preferences stay in that browser’s local storage. There is no class roster, no cloud save, and no tracking.

Point students at the one button above the figure, **Watch it build**. It plays the derivation as one run of five stages, and the board beside the figure writes one line of algebra per stage:

1. **Cut it up** — the charge cut into N pieces, each nearly a point charge.
2. **One piece** — one piece's field at P, ΔE = kΔQ/rᵢ², along the line from the piece to P.
3. **What cancels** — the piece's mirror partner, where it has one, and the sideways parts the two undo between them.
4. **Add them up** — on the symmetric lessons (the finite and infinite lines, the ring, the arc) the pieces go in as **mirror pairs**, so the cancellation is seen and the sum grows straight along the axis; elsewhere the pieces' arrows add as a chain.
5. **Shrink them** — the pieces made thinner without end: the sum becomes the integral, ΔQ becomes dQ, ≈ becomes =, and the answer arrives.

The run can be paused, scrubbed, and stepped a stage at a time from the bar under the figure, from the board's own lines, or with a presenter's clicker; on a phone the bar also carries each stage's algebra.

### Share a lesson

The address is the assignment: every student who opens a link sees the same lesson with the same values. **Lesson tools (…) → Copy a link to this lesson** copies it, so a projector in full screen or a phone without an address bar can still share one. While Watch it build is open the address names the stage it is on, so pausing the ring at What cancels and copying the link sends exactly that.

Example: [https://field.malekswilam.dev/?p=ring&r=2&stage=3](https://field.malekswilam.dev/?p=ring&r=2&stage=3) opens the ring with P at height 2, Watch it build held at the end of What cancels.

| query | meaning |
| --- | --- |
| `p` (`problem`, `id`) | Lesson id: `bisector`, `axial`, `infinite`, `ring`, `disk`, `semi`, `arc`, `sheet`, `endpoint`, `ramp`, `v-ring`, `v-disk`, `v-arc`, `v-rod-bisector`, `v-rod-axial` |
| `stage` | Open Watch it build held on a stage's finished frame: `1`–`5`, or `cut`, `piece`, `cancel`, `add`, `shrink`. `stage=5` opens on the answer. |
| `r` | Where P is: its distance r, its height z, or the end distance a (also `distance`) |
| `L` | Length, or 2R on the ring, disk and arc (also `size`) |
| `Q` | Charge or density, Q, λ, σ or λ₀ (also `charge`); never zero |
| `N` | Number of pieces, or rings on the disk and sheet (also `slices`) |
| `phi` | Arc opening angle in degrees: `phi=90` or `phi=90deg`; `phi=0.5pi` or `phi=pi/2` in multiples of π. A bare number up to 2π is read as radians, as the page wrote it before, so older links open as they did. |

Unknown keys and unparsable values are ignored, as is a `p` naming a lesson that is not ready — a link handed out earlier does not open a page we have since decided is not fit to read. Numbers are held to the sliders' ranges, and a charge of zero to the lesson's own. A link opens the lesson with the values it gives and the defaults for the rest, never mixed with what a student had saved. The page rewrites the address in its own spelling (`distance=2` for `r=2`, `phi=90deg`); both open the same lesson.

Older links may also carry `mode` (`divide`, `project`, `sum`, `integrate`), `pair=1` and `components=1`, which draw one of the run's pictures at rest; they still work, but `stage` shows the same picture with the board and the run beside it.

### Print or send an offline copy

Both are in the **Lesson tools (…)** menu at the top right, with Copy a link and the laws behind every lesson.

- **Print this lesson** opens the browser print dialog. The controls are left off; the figure, title, board and equations stay, with Limiting cases open every case prints under its own heading, and the board breaks between its steps. Paper size is US letter.
- **Save an offline copy of this lesson** downloads a self-contained HTML file (`field-builder-<lesson>.html`). Equations are TeX source so the file remains readable without a network. Students can Print → Save as PDF from there.

That HTML file is a printable snapshot of the open lesson.

### Keyboard

- **Walkthrough:** Tab stays inside the dialog. Escape returns focus to the Walkthrough button.
- **Watch it build:** each stage marker is a button (`Stage 3: What cancels`), and the arrow keys move between them. Landing on a stage lands on its first frame; **Play** carries on from there. While the run is open, Space plays and pauses it, and Page Down and Page Up — what a presenter's clicker sends — step to the next stage and back while the figure is on screen.
- **Sliders:** focusing one lights the feature it moves in the figure, the same as pointing at it.
- **Diagram:** open **Keyboard help** under the figure. Tab between native range inputs (selected element, observation distance, integration bounds). Arrow keys nudge the focused control; Home and End jump to its limits. Ring, disk, and sheet views also rotate with arrow keys; Home resets the camera.

Touch works on the figure: drag point P and the integration-bound handles. Verified at phone (390×844) and tablet (768×1024) widths.

In 3D, a CAD-style **view cube** sits in the figure's corner: click a named face (TOP, FRONT, BACK, LEFT, RIGHT) to glide there, drag the cube to spin the scene, or use the four steppers around it to turn a notch at a time. Each lesson opens at the angle that suits its geometry — flat shapes from well above, axial ones nearer edge-on.

### What the sliders do

Each slider is named by its symbol, and **pointing at one lights the thing it moves** in the figure: `r` lights the gap out to P, `L` or `R` the bracket across the charge, `Q` the marks along the body, `φ` the arc's opening angle, `N` the pieces (the rings, on the disk, the sheet and the disk's potential). Hovering and keyboard focus both do it. The page prints no numbers; a screen reader reads each value with its unit.

The charge sliders (Q, Line density λ, Surface density σ, Peak density λ₀) run from positive to negative but step over zero: with no charge there is no field and nothing for the run to say. A negative charge draws minus marks instead of plus, and every arrow turns round.

### The limit plot

**Limiting cases** pushes the geometry to an extreme and plots the exact result against the reference formula. The SVG carries a screen-reader table with columns **t**, **exact**, and **reference**.

### Potential is a shorter path

Potential lessons (`v-ring`, `v-disk`, `v-arc`, `v-rod-bisector`, `v-rod-axial`) run the same five stages, but every ΔV is a number with no direction: What cancels says that nothing cancels, and Add them up stacks the pieces' ΔV into a column beside P whose height is the sum. Ring, disk, and both rod potentials end their **Unfold the integration** with a **Differentiate back** step, E = −dV/dz on the ring and disk, −dV/dx on the rods, that recovers the matching field lesson. The arc potential has none: V = kQ/R for every opening angle, while the field does depend on φ.

## The fifteen lessons

On the three unbounded geometries a piece is drawn as **one angle at P**: the partition is equal
steps in θ, so an outer piece's charge lies hundreds of metres away, but the wedge it subtends at
P is always on screen and can be clicked. On a potential lesson the pieces' contributions are
**stacked into a column** beside P: numbers, which add with no direction to cancel.

**Field**

1. Finite line, perpendicular bisector (`bisector`)
2. Finite line, axial point beyond the end (`axial`)
3. Infinite line — angular substitution or finite-line limit (`infinite`)
4. Ring, central axis (`ring`)
5. Disk, built from annular rings (`disk`)
6. Semi-infinite line — both components survive (`semi`)
7. Arc, center of curvature (`arc`)
8. Infinite nonconducting sheet (`sheet`)
9. Finite rod standing on its end, P level with that end (`endpoint`)
10. The same rod with λ(y) = λ₀y/L — symmetry fails for position and for charge; the far field remembers the centre of charge at 2L/3 (`ramp`)

**Potential** (same layouts; scalar integral)

11. Ring axis (`v-ring`)
12. Disk axis (`v-disk`)
13. Arc at the centre (`v-arc`)
14. Rod on its perpendicular bisector (`v-rod-bisector`)
15. Rod beyond its end (`v-rod-axial`)

The library can collapse to give the figure more room. Each lesson ends with **Limiting cases** and **Easy to confuse with** — the check that the answer describes something real, and the neighbouring expressions with what each would actually mean.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

The development server prints the local preview URL (typically http://localhost:3000). Other scripts:

| command | what it does |
| --- | --- |
| `npm run check` | `tsc --noEmit` type check |
| `npm test` | Vitest unit + Chromium browser suite |
| `npm run lint` | oxlint |
| `npm run format` | oxfmt |
| `npm run build` | production build |
| `npm start` | serve the built output with `wrangler dev` |

If `npm test` cannot find Chromium, install it once with `npx playwright install chromium`. In some editor shells `PLAYWRIGHT_BROWSERS_PATH` points at an empty cache; run:

```sh
unset PLAYWRIGHT_BROWSERS_PATH
npm test
```

## Physics conventions

Coordinates, units, and assumptions are explicit in each model. Positive charge is the default. For a semi-infinite rod along positive x and P=(0,r), the field components are Ex = −kλ/r and Ey = +kλ/r. The magnitude is √2 k|λ|/r. The finite rod from y=0 to y=L observed at P=(r,0) has Ex = kQ/(r√(r²+L²)) and Ey = −kλ(1/r − 1/√(r²+L²)); as L grows at fixed λ it reproduces that semi-infinite pair. Disk formulas distinguish signed height from magnitude, and the ideal charged surface z=0 is excluded.

Source references are embedded in the problem definitions and shown with the worked derivations.

## Tests

`npm test` runs the unit suite in Node and the browser suite in Chromium. One test is skipped by design: the check that a shared link to a held-back lesson is ignored, which has nothing to point at while every lesson is live. They cover:

- every closed form against independent point-charge quadrature, including the five potentials and both charge polarities;
- the limiting cases the app asserts — rod to point charge, rod to infinite line, disk to sheet, zero field at a ring's center with its axial maximum at z = R/√2, a closing arc cancelling to zero, distance-independence of the sheet, ramp far-field and first-moment;
- the numerical sampler that drives the diagram: charge conservation, partial and reversed interval sums, infinite-domain tails, scalar potential sums;
- the symbolic answer checker, including notation variants, deliberate sign and projection mistakes, and rejection of unsafe input;
- **the physics, verified independently**: 193 checks built from Coulomb's law and each lesson's own setup sentence, with machinery deliberately unlike the first suite's (adaptive Simpson with Richardson extrapolation against fixed panels; a sinh sweep against doubled tails; a periodic trapezoid per annulus) so the two agree only where the physics is right. Worst error 6e-13 against a bar of 1e-10, and its teeth were checked by mutation — perturbing the ring's closed form by 2e-4 fails six tests by name and leaves the other 187 alone;
- what the figure actually draws: field lines traced from the geometry, the selected piece on screen, labels that do not escape the frame, and the pieces of unbounded lessons that do;
- the build sequence as choreography (five stages in the one order that makes the argument, the partition cut finer only at the end, and no scalar lesson claiming anything cancels) and as wiring (each stage checked by what appears in the drawing, not by what its caption says);
- every slider of every live lesson lighting a feature that is actually drawn;
- recovery from malformed local storage, teacher assignment URLs — including one pointing at a lesson that is not ready, which must be ignored — the print stylesheet, the offline HTML, the keyboard tour trap, and touch drags at phone and tablet sizes.

## What this is not

Gauss’s law, Biot–Savart, circuits, and student-account sync are not in the product. **Nothing here grades, scores or quizzes** — that was removed deliberately; the site's job is to make the derivation visible, not to test whether it landed. Numerals are currently stripped from the figures while the fundamentals are settled, so the lessons read symbolically. Visual theming may still shift from commit to commit.

## Project location and deployment

Public repository: [https://github.com/malekTheCoder/field-builder](https://github.com/malekTheCoder/field-builder).

Application address: https://field.malekswilam.dev. The active deployment workflow is `.github/workflows/pages.yml`. `npm run build:static` produces `dist-static/`; fonts and physics run locally in the browser. GitHub Actions validates and deploys that directory on pushes to main.

The custom-domain CNAME points `field` to `malekthecoder.github.io`. Domain DNS changes are managed by the owner; the main domain and mail records are independent of this app.
