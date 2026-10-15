# Gauss's law: plan (not started)

## Why it belongs here
The site teaches one method: cut the charge up, add Coulomb's law over the pieces. Gauss's law is
the other half of the unit. It is a shortcut that works only when symmetry already tells you the
field's direction and where its magnitude is the same. The best way to teach it is against the
integrals the reader has just built. For the infinite line and the infinite sheet they already
know the answer, 2kλ/r and σ/2ε₀, the long way. Gauss gets it in two lines. For the finite rod it
gets nothing, and seeing why is the lesson.

## Shape of a lesson: the same five-beat run, with Gauss's steps
1. **Symmetry.** What does the symmetry force the field to do? Which direction, and constant on
   which surfaces? This is the figure from "What cancels", reused.
2. **Choose the surface.** A cylinder, a pillbox or a sphere, drawn in 3D around the charge. The
   reader can drag its radius and height.
3. **Flux through each part.** The surface is cut into patches, each with its E·dA. The curved
   wall carries all the flux. The end caps carry none, because E lies along them, and they light
   up as zero.
4. **Charge inside.** The enclosed charge is highlighted. Grow the surface and it grows with it.
5. **Solve.** E·(area) = Q_enc/ε₀ gives E, and the board writes it as the derivation runs, just as
   "Build the integral" does.

## Lessons, in order
1. **Flux, the idea.** A uniform field through a tilted patch: Φ = E·A cos θ. Then a closed
   surface around a point charge: the flux is the same whatever its shape. This is the hook.
2. **Point charge and spherical shell.** A sphere: inside the shell E = 0, outside it is kQ/r².
3. **Solid sphere.** E grows linearly inside, then falls as 1/r² outside. The plot of E against r
   is part of the lesson.
4. **Infinite line.** A cylinder. Check the result against the integral lesson (2kλ/r) side by side.
5. **Infinite sheet.** A pillbox. Check against σ/2ε₀ from the sheet lesson. Explain why the
   distance drops out.
6. **Coaxial cylinders / a thick slab.** The surface placed in each region.
7. **When symmetry runs out.** The finite rod: no surface has E constant over it, so Gauss's law
   still holds but cannot be solved for E. (Not "when it fails": the law never fails; the owner asked
   that the name not suggest it does.) Send the reader to "Build the integral".
8. **Conductors** (optional): E = 0 inside, and charge on the surface.

## Interaction and visuals
- The 3D scene already exists (three/FieldStage, the view cube). The Gaussian surface is a
  translucent body with patch outlines, and each patch has an E arrow and a dA normal.
- Sliders for the surface size. The flux readout stays symbolic, per the house rule: no numerals
  on the page.
- "Limiting cases"-style checks: far away the solid sphere matches a point charge; at the axis the
  cylinder's field equals the line's.
- The same physics rigour as the rest: closed forms checked against numerical flux integrals over
  the drawn patches, in both charge signs, at slider extremes.

## Site structure
- A new family "Gauss's law" alongside "Build the integral": in the lesson list, the library and the
  home page. It is shown as **coming soon** until its first lessons are ready, using the same
  readiness switch idea as `src/problems/readiness.ts`.
- Cross-links. The infinite line and sheet integral lessons get "the same answer by Gauss's law →"
  once it exists.

## Open questions for the owner
- Lessons 1–5 first, then the rest?
- Inside the same Explorer page, or a separate "Gauss" view sharing the figure?
- Should the run's five beats be the same length and pacing as "Watch it build"?
