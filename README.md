# Field Builder

An interactive electric-field workbench for calculus-based introductory physics. Move an observation point, cut a charge distribution into elements, project each contribution, watch the finite vector sum become an integral, and check the result against a limiting case.

Nine continuous charge distributions are implemented and working today.

## What the app is

Two surfaces share one physics engine and one drawing engine.

- **The explorer** is the default view and the primary experience. Pick a geometry, drag point P, adjust the size, density and slice count, sweep from ΔQ to dQ, animate the running vector sum, and build the equation symbol by symbol. Numerical measurements and checks are available through an opt-in switch. The geometry library can collapse to give the figure more room. Four process tabs — slice, project, sum, integrate — change what the diagram emphasises. An assess view plots the exact field against each limiting case.
- **The practice wizard** is optional, reached from "Try the math" and loaded on demand. It walks the same geometry through eight steps (coordinates, charge element, one contribution, symmetry, substitution, bounds, integration, sanity check) at three difficulty levels, grading typed expressions symbolically. It draws the same per-geometry figure as the explorer, with the emphasis matched to the current step.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

The development server prints the local preview URL. Other scripts:

| command | what it does |
| --- | --- |
| `npm run check` | `tsc --noEmit` type check |
| `npm test` | Vitest suite |
| `npm run lint` | oxlint |
| `npm run format` | oxfmt |
| `npm run build` | production build |
| `npm start` | serve the built output with `wrangler dev` |

## Distributions

- Finite line, perpendicular bisector
- Finite line, axial point beyond the end
- Infinite line, angular substitution or finite-line limit
- Ring, central axis
- Disk, constructed from annular rings
- Semi-infinite line, both surviving vector components
- Arc, center of curvature
- Finite rod standing on its end, with P level with that end — both components survive
- Infinite nonconducting sheet, built from disk/ring integration

The UI uses React 19, Vinext/Vite, hand-authored SVG, Motion, KaTeX, MathLive, and math.js. Ring, disk, and sheet views rotate by dragging or using arrow keys; Home resets the view. Progress and preferences stay in local browser storage. The application itself has no student-account system or tracking. The GitHub Pages deployment is public; students do not need an account.

## Physics conventions

Coordinates, units, and assumptions are explicit in each model. Positive charge is the default. For a semi-infinite rod along positive x and P=(0,r), the field components are Ex = −kλ/r and Ey = +kλ/r. The magnitude is √2 k|λ|/r. The finite rod from y=0 to y=L observed at P=(r,0) has Ex = kQ/(r√(r²+L²)) and Ey = −kλ(1/r − 1/√(r²+L²)); as L grows at fixed λ it reproduces that semi-infinite pair. Disk formulas distinguish signed height from magnitude, and the ideal charged surface z=0 is excluded.

Source references are embedded in the problem definitions and shown with the worked derivations.

## Tests

`npm test` currently runs **411 passing tests** across eleven files. They cover:

- every closed form against independent point-charge quadrature, plus signs and directions for both charge polarities;
- the limiting cases the app asserts in its own UI — rod to point charge, rod to infinite line, disk to sheet, zero field at a ring's center with its axial maximum at z = R/√2, a closing arc cancelling to zero, distance-independence of the sheet;
- the numerical sampler that drives the diagram: charge conservation, partial and reversed interval sums, infinite-domain tails through a tangent substitution;
- the symbolic answer checker, including notation variants, deliberate sign and projection mistakes, and rejection of unsafe input;
- saved-progress round-tripping and recovery from malformed local storage.

The suite includes real Chromium tests for math entry, geometry rendering, observation-point and bound controls, keyboard rotation, and Home reset. Install Chromium with `npx playwright install chromium` if it is not already available. Manual checks cover desktop, 390px mobile and 820px tablet layouts; broad cross-browser and classroom validation remain ongoing.

## Status

Working: all nine geometries, the explorer, the optional practice wizard, onboarding, symbolic grading, and locally stored progress.

Deployment and validation:

- Deployed publicly on GitHub Pages at **https://field.malekswilam.dev**. DNS cutover is complete; GitHub manages the HTTPS certificate. No student sign-in is required.
- Cross-device and cross-browser QA (tablet widths, keyboard-only navigation, reduced-motion behaviour) is incomplete.
- Visual theming and the diagram camera are under active revision, so the interface may change from commit to commit.

## Project location and deployment

The source repository is public on GitHub.

Application address: https://field.malekswilam.dev. The active deployment workflow is `.github/workflows/pages.yml`. Legacy hosting configuration is retained only for migration history; it is not used by the Pages build.

## GitHub Pages deployment

The portable build has no login gateway. `npm run build:static` produces `dist-static/`; fonts and physics run locally in the browser. GitHub Actions validates and deploys this directory on pushes to main. The local agent handoff is intentionally gitignored.

The custom-domain CNAME points `field` to `malekthecoder.github.io`. Old hosting verification TXT records have been removed. Domain DNS changes are managed by the owner; the main domain and mail records are independent of this app.
