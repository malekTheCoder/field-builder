# Field Builder

An interactive electric-field workbench for calculus-based introductory physics. Move an observation point, cut a charge distribution into elements, project each contribution, watch the finite vector sum become an integral, and check the result against a limiting case.

Eight continuous charge distributions are implemented and working today.

## What the app is

Two surfaces share one physics engine and one drawing engine.

- **The explorer** is the default view and the primary experience. Pick a geometry, drag point P, adjust the size, density and slice count, sweep from ΔQ to dQ, animate the running vector sum, and read the exact closed form beside the numerical one. Four process tabs — slice, project, sum, integrate — change what the diagram emphasises. An assess view plots the exact field against each limiting case.
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
- Infinite nonconducting sheet, built from disk/ring integration

The UI uses React 19, Vite, hand-authored SVG, Motion, KaTeX, and math.js. Progress and preferences stay in local browser storage. No student accounts or tracking are required.

## Physics conventions

Coordinates, units, and assumptions are explicit in each model. Positive charge is the default. For a semi-infinite rod along positive x and P=(0,r), the field components are Ex = −kλ/r and Ey = +kλ/r. The magnitude is √2 k|λ|/r. Disk formulas distinguish signed height from magnitude, and the ideal charged surface z=0 is excluded.

Source references are embedded in the problem definitions and shown with the worked derivations.

## Tests

`npm test` currently runs **187 passing tests** across five files. They cover:

- every closed form against independent point-charge quadrature, plus signs and directions for both charge polarities;
- the limiting cases the app asserts in its own UI — rod to point charge, rod to infinite line, disk to sheet, zero field at a ring's center with its axial maximum at z = R/√2, a closing arc cancelling to zero, distance-independence of the sheet;
- the numerical sampler that drives the diagram: charge conservation, partial and reversed interval sums, infinite-domain tails through a tangent substitution;
- the symbolic answer checker, including notation variants, deliberate sign and projection mistakes, and rejection of unsafe input;
- saved-progress round-tripping and recovery from malformed local storage.

The suite is logic-only. Browser-level coverage of the SVG pointer and keyboard interactions is being added separately, and full cross-device and keyboard-only QA is still in progress.

## Status

Working: all eight geometries, the explorer, the optional practice wizard, onboarding, symbolic grading, and locally stored progress.

Not finished:

- **Not deployed.** The application is not yet published at its target address, and the DNS record for it does not exist yet.
- Cross-device and cross-browser QA (tablet widths, keyboard-only navigation, reduced-motion behaviour) is incomplete.
- Visual theming and the diagram camera are under active revision, so the interface may change from commit to commit.

## Project location and deployment

Local checkout: `/Users/malekswilam/Developer/field-builder`. The Git repository is private.

Target application address: `field.malekswilam.dev` — reserved, not yet serving. Hosting configuration is in `.openai/hosting.json`; credentials are never stored in the repository.
