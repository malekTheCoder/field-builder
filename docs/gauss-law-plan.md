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

## What the owner's "Gauss's Law Study Lab" adds (read 2026-10-15)
The owner built a full Gauss's law study guide as a claude.ai artifact ("Gauss's Law Study Lab",
https://claude.ai/artifact/Dy4cf8MBKeuYFLZPQfEYEf). Its extracted text is in
`.claude/loop/references/gauss-study-lab.txt`, kept out of git because it quotes textbook problems.
When the lessons are built, read it first and match its teaching order and its traps. What it changes
in this plan:

- **One recipe, said every time:** identify the symmetry, sketch the field's shape, draw the surface
  through the point, evaluate both sides, solve and check. Its three-letter summary, Left side / Right
  side / then divide, fits the site's five-beat run. Left side: the flux integral collapses to
  E·(area): 4πr²E, 2πrLE or 2EA. Right side: Q_enc, where the integral lives. Then solve.
- **Symmetry before calculation:** a lesson of its own on the three usable symmetries (spherical,
  cylindrical, planar). It argues why a long cylinder's field must point straight out, and says what
  makes a surface useful: each patch has E perpendicular and constant, E along it, or E = 0.
- **Flux in full:** the dot product for a field given as a vector, and nonuniform fields through
  curved surfaces (its worked case is a nonuniform field through a cube).
- **Why only the enclosed charge counts**, in four steps: a sphere around a point charge, any shape
  around it, a charge outside the surface, many charges.
- **Q_enc from a density as its own lesson:** the ratio method for uniform densities; thin shells
  (spherical 4πr'²dr', cylindrical 2πr'L dr', slab A dz') for nonuniform ones; and normalising ρ₀ when
  the problem gives Q. Its "integral mistakes graders see most" list belongs in the quiz bank:
  - ρ dr instead of ρ 4πr'² dr';
  - (4/3)πr³ used as dV;
  - upper limit R inside, or r outside;
  - ρ₀ left unknown when Q was given;
  - the slab's missing factor of two;
  - L or A left in E;
  - inside and outside answers that don't meet at R.
- **More lessons than this plan had:**
  - Conductors, with cavities that hold charge.
  - A hole as a positive object plus a negative one, by superposition.
  - The hard cases:
    - charge that extends to infinity;
    - densities that blow up at the centre;
    - running it backwards, from E to ρ;
    - flux integrals you actually have to do;
    - a slab whose density changes sign, where the symmetric pillbox gives 0 = 0 and a one-sided
      pillbox is needed.
- **Five misconceptions** for the quiz and the lessons:
  - zero flux means zero field;
  - E in the law is only the enclosed charge's field;
  - a bigger surface has more flux;
  - the surface must be a real object or enclose all the charge;
  - Q_enc is always the object's total charge.
- **A "Before you hand it in" checklist:**
  - units;
  - L and A cancelled;
  - E continuous at the boundary for a finite ρ, and a jump of σ/ε₀ across a surface charge;
  - the far limit looks like a point, a line or a sheet;
  - the direction stated;
  - diameter vs radius;
  - the angle measured from the normal.
- **An interactive "instrument":** drag charges into and out of a dashed Gaussian surface and watch
  the net flux. It changes only when a charge crosses the surface. That is a good first figure for
  "Flux, the idea".

Conventions: the study lab writes a surface density as η (Knight's letter). This site writes σ, and
keeps σ.

Proposed lesson list, updated:
1. Symmetry first.
2. Flux, the idea.
3. Why only the charge inside.
4. Q_enc from a density.
5. Spheres.
6. Lines and cylinders.
7. Sheets and slabs.
8. Conductors.
9. Holes by superposition.
10. When symmetry runs out.
11. The hard cases.

The site's "coming soon" list shows the shorter seven until the owner picks.
