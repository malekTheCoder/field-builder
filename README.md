# Field Builder

An interactive electric-field workbench for calculus-based introductory physics (Physics 2 / AP Physics C: E&M). Students move an observation point, cut a charge distribution into elements, watch a finite sum become an integral, and check the result against a limiting case.

**Live site:** [https://field.malekswilam.dev](https://field.malekswilam.dev) — public, no student accounts.

Fifteen lessons are in the library today: **ten electric-field geometries** and **five potential** problems on layouts students already know. The tenth field lesson is a rod with ramp density λ(y) = λ₀y/L, where the usual symmetry argument fails twice.

## In class

Open the live site. The explorer is the default view. Optional graded practice is **Try the math** (loaded on demand). Progress and preferences stay in that browser’s local storage. There is no class roster, no cloud save, and no tracking.

### Share a lesson

The address bar is the assignment. Paste a link and every student opens the same geometry, process tab, and parameters.

Example: [https://field.malekswilam.dev/?p=v-ring&mode=sum&r=2](https://field.malekswilam.dev/?p=v-ring&mode=sum&r=2)

| query | meaning |
| --- | --- |
| `p` (`problem`, `id`) | Lesson id: `bisector`, `axial`, `infinite`, `ring`, `disk`, `semi`, `arc`, `sheet`, `endpoint`, `ramp`, `v-ring`, `v-disk`, `v-arc`, `v-rod-bisector`, `v-rod-axial` |
| `mode` | Process tab: `divide`, `project`, `sum`, or `integrate` |
| `r` | Observation distance (also `distance`) |
| `L` | Length or 2R (also `size`) |
| `Q` | Charge or density slider (also `charge`) |
| `N` | Starting piece count (also `slices`) |
| `c` | Discrete→continuous morph, 0–1 (also `continuum`) |
| `phi` | Arc opening angle, radians |
| `pair=1` | Show the symmetric partner (field lessons) |
| `components=1` | Resolve field contributions into components |

Unknown keys and unparsable numbers are ignored. Numbers are clamped to the live slider ranges. A link with `p=` skips the first-visit tour for that load. Copying from the address bar may show `distance=2` instead of `r=2`; both open the same lesson.

### Print or send an offline copy

Printer and download icons sit in the **top-right header** of the explorer and of Try the math.

- **Print this lesson** opens the browser print dialog. Chrome is hidden; the figure, title, and equations stay. Paper size is US letter.
- **Save an offline copy of this lesson** downloads a self-contained HTML file (`field-builder-<lesson>.html`). Equations are TeX source so the file remains readable without a network. Students can Print → Save as PDF from there.

The saved HTML is a snapshot of the open lesson, not a portable save of wizard progress. Work on a shared Chromebook cart stays on that device unless the student downloads a copy.

### Keyboard

- **Quick tour:** Tab stays inside the dialog. Escape returns focus to Quick tour.
- **Try the math:** Escape on How it works returns to that button. Arrow/Space select origin choices; Enter on **Check this step** grades. Math entry is in the tab order; if the math keyboard is unavailable, the plain-text field still submits on Enter.
- **Diagram:** open **Diagram controls and keyboard help**. Tab between native range inputs (selected element, observation distance, integration bounds). Arrow keys nudge the focused control; Home and End jump to its limits. Ring, disk, and sheet views also rotate with arrow keys; Home resets the camera.

Touch works on the figure: drag point P and the integration-bound handles. Verified at phone (390×844) and tablet (768×1024) widths.

### Potential is a shorter path

Field lessons still walk coordinates → charge element → one contribution → **symmetry / projection** → substitution → bounds → integration → sanity check.

Potential lessons (`v-ring`, `v-disk`, `v-arc`, `v-rod-bisector`, `v-rod-axial`) skip symmetry and projection. Every dV is a scalar; nothing cancels by pairing. The explorer’s second process tab is **dV**, not Project, and the partner/component switches are absent. Ring, disk, and both rod potentials end with an optional **E = −∇V** step that recovers the matching field lesson. The arc potential has no gradient step: V = kQ/R for every opening angle, while the field does depend on φ.

## The fifteen lessons

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

Numerical values are opt-in (**Try numerical values**). The geometry library can collapse to give the figure more room. **Test the limits** plots the exact result against each limiting case.

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

`npm test` currently runs **677 passing tests** across **23 files**. They cover:

- every closed form against independent point-charge quadrature, including the five potentials and both charge polarities;
- the limiting cases the app asserts — rod to point charge, rod to infinite line, disk to sheet, zero field at a ring's center with its axial maximum at z = R/√2, a closing arc cancelling to zero, distance-independence of the sheet, ramp far-field and first-moment;
- the numerical sampler that drives the diagram: charge conservation, partial and reversed interval sums, infinite-domain tails, scalar potential sums;
- the symbolic answer checker, including notation variants, deliberate sign and projection mistakes, and rejection of unsafe input;
- saved-progress round-tripping and recovery from malformed local storage;
- teacher assignment URLs, print stylesheet and offline HTML, keyboard tour trap, wizard grading, and touch drags at phone and tablet sizes.

## What this is not

Gauss’s law, Biot–Savart, circuits, and student-account sync are not in the product. Progress does not follow a student from one computer to another. Visual theming may still shift from commit to commit.

## Project location and deployment

Public repository: [https://github.com/malekTheCoder/field-builder](https://github.com/malekTheCoder/field-builder).

Application address: https://field.malekswilam.dev. The active deployment workflow is `.github/workflows/pages.yml`. `npm run build:static` produces `dist-static/`; fonts and physics run locally in the browser. GitHub Actions validates and deploys that directory on pushes to main.

The custom-domain CNAME points `field` to `malekthecoder.github.io`. Domain DNS changes are managed by the owner; the main domain and mail records are independent of this app.
