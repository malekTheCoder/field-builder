# Field Builder

An interactive electric-field visualization and equation builder for calculus-based physics. Explore continuous charge distributions by moving an observation point, dividing charge into smaller elements, projecting vectors, and watching a finite sum become an integral.

**In development:** the initial derivation engine and eight problem definitions are in place. The default experience is being redesigned as an open visual workbench, with animated geometry, onboarding, and optional symbolic practice. This repository is updated as implementation and validation progress.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

The development server prints the local preview URL. Run `npm run build` for the deployment build and `npx tsc --noEmit` for type checking. Automated numerical and symbolic checks are being added with Vitest.

## Distributions

- Finite line, perpendicular bisector
- Finite line, axial point beyond the end
- Infinite line, angular substitution or finite-line limit
- Ring, central axis
- Disk, constructed from annular rings
- Semi-infinite line, both surviving vector components
- Arc, center of curvature
- Infinite nonconducting sheet, built from disk/ring integration

The UI uses React, SVG, Motion, KaTeX, and math.js. Progress and preferences stay in local browser storage. No student accounts or tracking are required.

## Physics conventions

Coordinates, units, and assumptions are explicit in each model. Positive charge is the default. For a semi-infinite rod along positive x and P=(0,r), the field components are Ex = −kλ/r and Ey = +kλ/r. The magnitude is √2 k|λ|/r. Disk formulas distinguish signed height from magnitude, and the ideal charged surface z=0 is excluded.

Source references are embedded in the problem definitions and shown with the worked derivations. Closed forms are checked against independent numerical integrations before release.

## Project location and deployment

Local checkout: `/Users/malekswilam/Developer/field-builder`.

Target application address: `field.malekswilam.dev`. Hosting configuration is in `.openai/hosting.json`; credentials are never stored in the repository.
