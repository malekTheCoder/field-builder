# Field Builder — AP Physics C: E&M content specification

**Status:** ground-truth specification. Not an implementation.
**Audience:** the agents who will implement these problems.
**Author's note on trust:** every closed form in §4 was derived here and then checked
numerically against brute-force quadrature of the underlying point-charge / current-element
sum. Results that passed carry **[verified]**. Results I did not machine-check carry
**[unverified — check at implementation time]**. Nothing in this document should be taken
on the author's authority alone; §7 is an explicit confidence register.

**Update 2026-09-10:** the sixteen formerly unverified items in §7 have all been machine-checked
by an independent harness (`tests/spec-formulas.test.ts`) and all held. Achieved errors are
tabulated in §7; the `[unverified]` tags in the body of §4 are retained as history but are
superseded by that table.

Conventions used throughout:

- `k = 1/(4πε₀)`, `μ₀/4π` is written out when it appears.
- Positive charge / positive current are the defaults, as in the existing definitions.
- Signed components are stated; magnitudes use `|Q|`, `|λ|`, `|σ|`.
- Machine-readable expressions are given in the `mathjs` dialect the repo already uses
  (`k*lambda*r/(y^2+r^2)^(3/2)`), so they can be pasted into `Problem.kernel` / `.result`
  and picked up by `tests/ground-truth.test.ts`.

---

## 1. Curriculum map

AP Physics C: E&M is organised by the College Board into content areas covering
electrostatics and Coulomb's law; electric fields and potential of continuous
distributions; Gauss's law; conductors, capacitors and dielectrics; electric circuits;
magnetic fields (Biot–Savart and Ampère); and electromagnetic induction (Faraday/Lenz,
inductance, LR circuits).

> The unit *numbering* has changed between CED revisions. This document maps by **content
> area**, not by unit number, deliberately. If unit labels are ever shown in the UI,
> check them against the current CED rather than against this document.

| Content area | Weight (roughly) | Field Builder today | Gap |
| --- | --- | --- | --- |
| Coulomb's law, point charges, superposition | part of ~30% | Implicit only — `dE = k dQ/r²` is the kernel of every problem, but there is no discrete point-charge or dipole problem | **Small gap.** Cheap to close (§4 Stage 2) |
| **E of continuous distributions (the integral)** | part of ~30% | **Complete and excellent.** 9 geometries, symmetry arguments, substitutions, bounds, limits, misconceptions | Non-uniform density, superposition of derived results, general endpoints |
| Gauss's law | part of ~30% | Only as an *aside* — `sheet` mentions the pillbox in a worked step | **Large gap.** Zero spheres, zero cylinders, zero slabs, zero conductor surfaces |
| Electric potential of continuous distributions | ~15–20% | **Absent entirely.** No `V` anywhere in the codebase | **Largest single gap relative to how well it fits.** |
| `E = −∇V`, equipotentials | ~15–20% | Absent | High-value, cheap once V exists |
| Conductors: shielding, induced charge, E=σ/ε₀ at a surface | ~15% | Absent | Needs Gauss flow |
| Capacitors, capacitance, energy, dielectrics | ~15% | Absent | Partly fits (ΔV = −∫E·dl), partly algebraic |
| **Electric circuits** (Kirchhoff, RC, RL) | ~15% | Absent | **Does not fit the mechanic.** See §3.3 |
| Magnetic force on charges/wires | part of ~20% | Absent | Algebraic, poor fit |
| **B of current distributions (Biot–Savart)** | part of ~20% | Absent | **Best fit of any missing topic.** Same integral, same engine |
| Ampère's law | part of ~20% | Absent | Shares a flow with Gauss |
| Faraday's law, flux integrals, motional emf | ~15% | Absent | Flux **is** an integral over a distribution — genuinely fits |
| Inductance, LR circuits | part of ~15% | Absent | Circuits-shaped; does not fit |

### 1.1 One-line honest summary

The app currently implements **one column** of a two-by-three curriculum grid:

|  | line/arc | surface | volume |
| --- | --- | --- | --- |
| **E by direct integration** | ✅ 6 problems | ✅ 2 problems | ❌ |
| **V by direct integration** | ❌ | ❌ | ❌ |
| **E by Gauss** | ❌ | ❌ | ❌ |
| **B by Biot–Savart** | ❌ | ❌ | ❌ |
| **B by Ampère** | ❌ | ❌ | ❌ |
| **Φ and emf** | ❌ | ❌ | — |

That is a *deep* implementation of a *narrow* slice. Every remaining row is reachable; two
of them (V, Biot–Savart) reuse the existing wizard almost verbatim.

---

## 2. What the integral-builder mechanic is actually good at

The eight-step wizard — coordinates → charge element → one contribution → symmetry →
substitution → bounds → integration → sanity check — is a *specific* pedagogical claim:
that the hard part of these problems is **turning a geometric picture into a
single-variable definite integral**, and that the calculus itself is the easy part.

That claim is true for:

- **E of continuous charge distributions.** Already done.
- **V of continuous charge distributions.** Same picture, *fewer* steps (no projection, no
  vector decomposition). The wizard degenerates gracefully.
- **B of continuous current distributions.** Same picture, same number of steps, a
  different projection factor. See §3.2 — this is the strongest transfer available.
- **Magnetic flux Φ = ∫B·dA over a region where B varies.** Same picture; the "distribution"
  is the loop's area rather than the source.
- **Motional emf ∫(v×B)·dl along a rod.** Same picture, one variable.
- **Energy U = ∫u dV.** Same picture, but requires E(r) as an input, so it is downstream of
  Gauss.

It is a **poor** fit — actively misleading if forced — for:

- **Circuits.** Kirchhoff loops are simultaneous linear equations. RC/RL transients are
  separable ODEs in *time*, not spatial accumulations over a distribution. Dragging bracket
  handles along a "distribution" is meaningless there. See §3.3.
- **Magnetic force** F = qv×B, F = IL×B. Algebra plus a right-hand rule. No integral.
- **Dielectrics.** Almost entirely `κ`-substitution algebra.
- **Gauss's and Ampère's laws.** These are the *opposite* pedagogy: their whole point is
  that you **avoid** the integral by choosing a surface on which E is constant. Presenting
  them through an integral-building wizard would teach the wrong lesson. They need their
  own flow. See §3.1.

---

## 3. Three structural judgements

### 3.1 Gauss and Ampère need their own flow — and it is worth building

Do not force Gauss into the eight-step wizard. The correct flow is five steps and is
*shared* between Gauss and Ampère:

1. **Identify the symmetry.** (spherical / cylindrical / planar; or, for Ampère,
   cylindrical / solenoidal / toroidal.) Multiple choice, with a "why" follow-up.
2. **Choose the surface (or loop)** and justify it: on it, `E` is constant in magnitude and
   either parallel or perpendicular to `dA` everywhere.
3. **Evaluate the flux (or circulation) geometrically** — `Φ = E·A`, `∮B·dl = B·(2πr)`.
   No integration is performed; that is the pedagogical point.
4. **Compute `q_enc(r)` (or `I_enc(r)`).** *This* is where an integral can genuinely appear,
   for non-uniform `ρ(r)` or `J(r)`, and it is where students actually fail.
5. **Solve and sanity-check** — continuity at boundaries, the `r > R` point-charge limit,
   the `r → 0` behaviour.

**What is genuinely gained:** (a) it is roughly 30% of the AP-C E&M electrostatics
weighting and currently 0% covered; (b) it produces the *volume* distributions
(solid sphere, solid cylinder, slab) the app has no other route to; (c) it lets the app
teach the single most-tested conductor result, `E = σ/ε₀` at a conductor surface versus
`σ/(2ε₀)` for an isolated sheet — a contrast the app is *uniquely* positioned to make,
because it already derives `σ/(2ε₀)` by honest integration; (d) step 4 reuses the existing
integral machinery for non-uniform `ρ(r)`, so the wizard is not thrown away.

**Cost:** a new step-sequence type and a new renderer for nested surfaces. See §5.

### 3.2 Biot–Savart is the same skill and is the highest-leverage addition

**Verdict: same skill, and the vector cross product does *not* break it.** The argument:

For every standard AP-C geometry, the cross product `dl × r̂` reduces to a *scalar factor
times a fixed unit vector*, exactly as `cos α` did for the electric field:

| Geometry | `|dl × r̂|` | Direction of every `dB` | Decomposition needed? |
| --- | --- | --- | --- |
| Straight wire, P off-axis | `dl sin θ` | all parallel (out of / into the plane) | **none** — simpler than the rod's E field |
| Circular loop, P on axis | `dl` (always ⊥) | cone about the axis | one projection, factor `R/r` |
| Arc, P at centre | `dl` (always ⊥) | all parallel | **none** |
| Solenoid, P on axis | — | built from loops | reuse the loop result |

So the Biot–Savart problems are, step for step:

- `dQ = λ dy` → `dI-element = I dl`
- `dE = k dQ/r²` → `dB = (μ₀/4π) I dl sin θ / r²`
- "which components cancel" → *identical* symmetry step (and for the straight wire, the
  answer is the stronger "there is nothing to cancel — every `dB` is parallel")
- projection, one variable, bounds, integrate, limit → identical

And the **finite straight wire integral is literally the same integral as the rod's `Eₓ`**:

```
E_x(rod)   = kλ · ∫ r dy /(y²+r²)^{3/2}   = (kλ/r)[ y/√(y²+r²) ]
B(wire)    = (μ₀I/4π) · ∫ d dy /(y²+d²)^{3/2} = (μ₀I/4πd)[ y/√(y²+d²) ]
```

with `kλ → μ₀I/4π`. A student who has done `bisector` has already done the finite wire.
That is an enormous pedagogical payoff for near-zero conceptual novelty, and it means the
whole engine — sampling, diagram, bounds handles, symbolic grading — is reused.

**The one genuine novelty**, and it must be taught explicitly, is that the loop-on-axis
projection factor is `R/r`, **not** `z/r`. For the charged ring, the surviving component is
along `z` and the projection is `z/√(R²+z²)`. For the current loop, each `dB` is
perpendicular to the radius vector, so the surviving axial share is `R/√(R²+z²)`. Numerically,
at `R=1.6, z=0.9`: ring uses `0.4903`, loop uses `0.8716`. Same picture, swapped legs of the
same right triangle. This is a *feature* — it is the best possible misconception target the
new topic could offer.

**Recommendation: build Biot–Savart before Gauss.** It is cheaper, it reuses more, and it
converts the app from "an electrostatics tool" into "an E&M tool".

### 3.3 Circuits: say no, plainly

Kirchhoff's rules, equivalent resistance, RC and RL transients are core AP-C and are
**not** integral-building exercises. Forcing them into this app would produce a worse
circuits tool than any of a dozen existing ones and would dilute the thing this app does
better than anything else.

Two narrow exceptions that *are* in scope and should be taken:

- **Capacitance via `ΔV = −∫E·dl`.** Once Gauss gives `E(r)` for a cylinder or a sphere,
  computing `C = Q/ΔV` is a one-line radial integral and is genuinely the app's mechanic.
  (§4.5.7)
- **Field energy `U = ∫ u dV = ∫ ½ε₀E² dV`.** A radial integral with a non-trivial
  integrand and a beautiful closed form. (§4.5.8)

Everything else circuit-shaped: out of scope. If the owner ever wants circuits, it is a
separate app mode with a separate mechanic, not a tenth geometry.

---

## 4. Ground truth catalogue

Each entry gives everything a `Problem` literal needs. Where the entry needs a schema change
or a different flow, it says so at the top.

---

### Stage 1 — Non-uniform linear density

These are the cheapest high-value additions in the document: same geometry as problems that
already exist, same eight steps, and they attack the single most durable misconception the
current app *cannot* attack — that "symmetry" is a property of the shape rather than of the
shape **and** the density.

#### 4.1.1 `ramp` — Rod with λ(y) = λ₀ y/L

**Fits current `Problem` schema as-is** (one new symbol, `lambda0`).

**Geometry.** Thin rod on the y-axis from `y = 0` to `y = L`. `P = (r, 0)`, `r > 0` — i.e.
level with the rod's lower end. This is deliberately the **same geometry as the existing
`endpoint` problem (Knight P26.41)**, so the app can present them as a matched pair:
identical shape, identical P, different density.

Density: `λ(y) = λ₀ y/L`. Zero at the near end, maximum `λ₀` at the far end.
Total charge `Q = ∫₀^L λ₀ y/L dy = λ₀L/2`.

**Charge element.**
```
dQ = λ(y) dy = (lambda0*y/L)*dy
```
Machine form: `dq: 'lambda0*y/L*dy'`.

**Symmetry — this is the whole point of the problem.**
Nothing cancels, and it is important that students see *two different reasons* nothing
cancels here:

- The **geometric** reason (shared with `endpoint`): P is level with one end, so an element
  at `+y` has no partner at `−y`. Every element sits above P.
- The **density** reason (new): even if you moved P to the rod's midpoint `(r, L/2)`,
  restoring the geometric symmetry, the field would **still** have a surviving `E_y`,
  because the partner elements at `L/2 ± u` now carry *different charges*
  (`λ₀(L/2+u)/L ≠ λ₀(L/2−u)/L`). The reflection maps the shape onto itself but does not map
  the charge onto itself.

That second bullet is the payload. Every symmetry argument the app currently makes silently
assumes uniform λ; this problem is where that assumption is made visible. The wizard's
symmetry step should offer, as a distractor, "the y-components cancel" — the answer that
was correct for `bisector` and is now wrong for two independent reasons.

**Reduction and bounds.** Element at `(0, y)`; the source-to-P vector is `(r, −y)`;
`rᵢ = √(y² + r²)`. Bounds `y: 0 → L`.

```
dE_x = k·dQ·r /(y²+r²)^{3/2}      kernel:  'k*lambda0*y*r/(L*(y^2+r^2)^(3/2))'
dE_y = −k·dQ·y /(y²+r²)^{3/2}     kernel2: '-k*lambda0*y^2/(L*(y^2+r^2)^(3/2))'
```

**Worked integration.**

x-component — the `y dy` numerator makes this *easier* than the uniform case:
```
u = y² + r²,  du = 2y dy
∫₀^L y dy/(y²+r²)^{3/2} = [ −1/√(y²+r²) ]₀^L = 1/r − 1/√(L²+r²)

E_x = (kλ₀ r/L)(1/r − 1/√(L²+r²)) = (kλ₀/L)(1 − r/√(L²+r²))
```

y-component — needs the standard `y²` antiderivative:
```
∫ y² dy/(y²+r²)^{3/2} = ln(y + √(y²+r²)) − y/√(y²+r²)
   (check by differentiating: 1/√(y²+r²) − r²/(y²+r²)^{3/2} = y²/(y²+r²)^{3/2} ✓)

E_y = −(kλ₀/L)[ ln((L + √(L²+r²))/r) − L/√(L²+r²) ]
```

**Closed form [verified].**
```
E_x = (kλ₀/L)·(1 − r/√(L²+r²))                               > 0
E_y = −(kλ₀/L)·[ ln((L+√(L²+r²))/r) − L/√(L²+r²) ]           < 0
```
Machine forms:
```
result:          'k*lambda0/L*(1-r/sqrt(L^2+r^2))'
secondaryResult: '-k*lambda0/L*(log((L+sqrt(L^2+r^2))/r)-L/sqrt(L^2+r^2))'
```
Numerically confirmed against 4×10⁵-element quadrature (`λ₀=1.7, L=2.7, r=1.3`):
`E_x = 0.35648646`, `E_y = −0.36299089`, relative error `< 3×10⁻¹²`.

⚠ **Requires `log` in `allowedFunctions`** — see §5.1. `mathjs`'s `log(x)` is natural log.

**Limiting cases.**

1. **Far field, `r ≫ L`** [verified]. `E_x → kQ/r²` with `Q = λ₀L/2`.
   Numerically at `r = 400L`: `1.96758×10⁻⁶` vs `kQ/r² = 1.96759×10⁻⁶`.
   *What the student checks:* the total charge is **λ₀L/2, not λ₀L** — half the rod is
   nearly empty. Students who write `kλ₀L/r²` are off by exactly a factor of 2, and the
   comparison plot will show a clean 2× offset that never converges. Excellent.
2. **Far-field transverse behaviour, `r ≫ L`** [verified].
   `E_y → −kλ₀L²/(3r³) = −kQ·y_cm/r³` with `y_cm = 2L/3`.
   Numerically at `r = 400L`: `−3.27930×10⁻⁹` vs `−3.27932×10⁻⁹`.
   *What the student checks:* `E_y` dies one power faster than `E_x`, and the coefficient is
   the **centre of charge**, which sits at `2L/3` — not at `L/2`. This is a genuinely
   beautiful check and it ties the non-uniform density back to a number the student can
   compute independently as `∫yλ dy / ∫λ dy`.
3. *(optional third)* **Uniform limit as a control.** If `λ(y)` is replaced by the constant
   `λ₀`, the results must collapse onto the existing `endpoint` closed form
   `E_x = kλL/(r√(r²+L²))`, `E_y = −kλ(1/r − 1/√(r²+L²))`. Worth wiring as a cross-check
   test even if not shown as a student-facing limit.

**Misconceptions and feedback.**

| Student writes | Diagnosis | Feedback |
| --- | --- | --- |
| `dQ = lambda0*dy` | Treated `λ₀` as the density instead of the *peak* density | "λ₀ is the density at the far end only. At height y the rod is thinner: λ(y) = λ₀y/L. Slide the slice down the rod and watch the charge in it shrink to zero." |
| `dQ = Q*y/L*dy` | Confused total charge with peak density | "Q is a charge (C), λ₀ is a density (C/m). Q = λ₀L/2 here, not λ₀L — check the units of your dQ: it must come out in coulombs." |
| Symmetry: "the y-components cancel" | Imported the `bisector` argument | "That was true when λ was uniform *and* P sat on the bisector. Here **both** conditions fail. Even at the midpoint, the element above P carries more charge than the one below it, so the two vertical arrows have different lengths." |
| `E_x = k*Q/(r*sqrt(r^2+L^2))` (the uniform answer with Q = λ₀L/2) | Assumed a non-uniform rod behaves like a uniform rod of the same total charge | "Total charge is not enough. The charge here sits farther from P on average, so E_x is weaker than a uniform rod of the same Q. Compare the two in the far-field plot: they agree at large r and diverge as you come close." |
| `E_y = +…` (sign flipped) | Forgot that the source-to-P vector points *down* | "Every element is above P. A positive charge above P pushes a positive test charge downward, so every dE_y is negative and the sum cannot come out positive." |

**Citation.** Knight, *Physics for Scientists and Engineers*, ch. 26 (continuous charge
distributions; non-uniform λ appears in the end-of-chapter problems). Cross-check against
OpenStax *University Physics Vol. 2* §5.5,
<https://openstax.org/books/university-physics-volume-2/pages/5-5-calculating-electric-fields-of-charge-distributions>.

---

#### 4.1.2 `quadratic` — Rod with λ(y) = λ₀ (y/L)²  *(optional variant)*

Same geometry as 4.1.1. `Q = λ₀L/3`, `y_cm = 3L/4`.

**Closed forms [verified].**
```
E_x =  (kλ₀ r/L²)·[ ln((L+√(L²+r²))/r) − L/√(L²+r²) ]
E_y = −(kλ₀/L²)·[ (√(L²+r²) + r²/√(L²+r²)) − 2r ]
```
(The `E_y` bracket is `F(L) − F(0)` with `F(y) = √(y²+r²) + r²/√(y²+r²)`; `F(0) = 2r`.)
Numerically confirmed (`λ₀=1.7, L=2.7, r=1.3`): `E_x = 0.17477339`, `E_y = −0.22401409`,
relative error `< 4×10⁻¹³`.

**Verdict: build 4.1.1 first; add this only if a second non-uniform example is wanted.**
It teaches the same lesson and its integrals are uglier. Its one distinct virtue is that the
`ln` now appears in `E_x` and the algebraic root in `E_y` — the *reverse* of 4.1.1 — which
is a nice demonstration that the shape of the answer is not a property of the geometry.

---

#### 4.1.3 `cosring` — Ring with λ(θ) = λ₀ cos θ, field at the centre

**Fits the current schema.** This is the best single problem in Stage 1 and I recommend it
strongly.

**Geometry.** Ring of radius `R` in the xy-plane, centred on the origin. `P` is the centre,
`(0,0,0)`. Element at angle `θ`: position `(R cos θ, R sin θ, 0)`. Density
`λ(θ) = λ₀ cos θ` — positive on the `+x` half, negative on the `−x` half.

**Total charge is exactly zero:** `Q = ∫₀^{2π} λ₀ cos θ · R dθ = λ₀R[sin θ]₀^{2π} = 0`
(confirmed numerically: `3×10⁻¹⁶`).

**Charge element.** `dQ = λ₀ cos θ · R dθ` — machine: `'lambda0*cos(theta)*R*dtheta'`.

**One contribution.** Every element is exactly `R` from P. The field at the centre from a
*positive* element points **inward**, i.e. along `−(cos θ, sin θ)`:
```
dE_x = −(k λ₀ cos θ/R)·cos θ dθ = −(kλ₀/R) cos²θ dθ
dE_y = −(k λ₀ cos θ/R)·sin θ dθ = −(kλ₀/R) cos θ sin θ dθ
```
Note the `R`s: `k dQ/R² = k λ₀ cos θ R dθ/R² = (kλ₀/R) cos θ dθ`. One power of `R` cancels,
exactly as in the existing `arc` problem.

**Symmetry.** `E_y = 0`, by reflection `θ → −θ`: `cos θ` is even (partners carry equal
charge) while `sin θ` is odd (their y-projections oppose). `E_x` does **not** vanish, even
though the total charge is zero, because the reflection `θ → π − θ` that would pair the two
halves maps positive charge onto *negative* charge — it is an anti-symmetry, and it makes
the x-contributions **add**, not cancel. Both halves push toward `−x`: the positive half
pushes away from itself, the negative half pulls toward itself, and both of those are `−x̂`.

**Bounds.** `θ: 0 → 2π`.

**Worked integration.**
```
∫₀^{2π} cos²θ dθ = π          (half-angle: cos²θ = (1+cos2θ)/2)
∫₀^{2π} cos θ sin θ dθ = ½[sin²θ]₀^{2π} = 0
```

**Closed form [verified].**
```
E_x = −π k λ₀ / R        E_y = 0        E_z = 0
```
Machine: `result: '-pi*k*lambda0/R'`. Numerically confirmed (`λ₀=2.1, R=1.6`):
`−4.1233404` both ways, relative error `1×10⁻¹⁴`.

**Limiting cases.**

1. **Zero net charge, non-zero field.** `Q_total = 0` exactly, and yet `E ≠ 0`. The far
   field falls as a **dipole**, `~1/r³`, not `1/r²` — the leading multipole is the dipole
   moment `p = ∫ r dq`. *(Far-field coefficient marked [unverified]; the qualitative
   `1/r³` scaling is certain, the coefficient `p = πλ₀R²x̂` should be checked numerically
   before it is shown to students.)*
2. **Rotate the density.** With `λ(θ) = λ₀ sin θ` instead, the identical argument gives
   `E_y = −πkλ₀/R`, `E_x = 0` — the field simply rotates with the density. Students can
   predict this before computing it. [derived by the same integral; **unverified
   numerically**, though it follows by the substitution `θ → θ − π/2` and is safe.]
3. **Uniform control.** Replace `λ₀ cos θ` with a constant `λ₀`: both integrals become
   `∫cos θ dθ = 0` and `∫sin θ dθ = 0`, recovering the existing `arc` problem's
   full-circle result `E = 0`. This is the cleanest possible demonstration that the
   cancellation in a uniform ring is a statement about the **charge**, not the shape.

**Misconceptions.**

| Student writes | Diagnosis | Feedback |
| --- | --- | --- |
| `E = 0` | "Net charge is zero, so the field is zero" | "Net charge zero means the *monopole* term is zero. Fields are vectors: the positive half and the negative half both push a test charge toward −x, so they reinforce. Total charge tells you the far field, not the field at the centre." |
| `dQ = lambda0*dtheta` | Angle mistaken for arc length | (existing `arc` feedback applies verbatim) "An angle is not a length. The orange arc has length R dθ." |
| `dE_x = +(k lambda0/R) cos^2(theta) dtheta` | Sign of the inward direction dropped | "At the centre, the field from a positive element points *away from that element* — that is, inward toward the origin's other side. For an element at angle θ, that direction is −(cos θ, sin θ)." |
| `E_x = 0` "because ∫cos θ dθ = 0" | Integrated the density instead of the projected field | "You integrated the charge, not the field. The projection contributes a second factor of cos θ, and cos²θ is never negative — that is precisely why this integral survives when the charge integral does not." |
| Symmetry answer: "the x-components cancel across the y-axis" | Applied a shape reflection without checking the charge | "Reflect θ → π − θ. The shape maps to itself, but the charge changes sign. A symmetry of the *object* is only a symmetry of the *field* if the charge respects it too." |

**Citation.** Griffiths, *Introduction to Electrodynamics*, ch. 3 (multipole expansion; the
`cos θ` ring is the canonical pure-dipole line distribution). Also Halliday/Resnick/Walker,
ch. 22, non-uniform-ring end-of-chapter problems.

---

#### 4.1.4 λ(y) = λ₀ sin(πy/L) — **assessed and rejected as a full problem**

The task asked for this specifically. My finding, stated plainly:

**The field integral has no elementary closed form.** `∫₀^L sin(πy/L) dy/(y²+r²)^{3/2}`
cannot be expressed in elementary functions (it reduces to sine/cosine integrals). The same
is true of the potential, `∫₀^L sin(πy/L) dy/√(y²+r²)`. The app's entire architecture —
`Problem.result`, the symbolic grader, `tests/ground-truth.test.ts` comparing a closed form
against quadrature — assumes a closed form exists.

**Recommendation.** Do not make it a wizard problem. Two salvage options, in order of value:

- **(a) Use it in the explorer only, as a density-shape toggle with no closed form.**
  The numerical sampler and the diagram work perfectly well without one; the student sees
  the vector sum converge and reads off a number. Everything up to and including "reduce to
  one variable" is legitimate; only the last two steps are unavailable.
- **(b) Use it as a *symmetry-and-total-charge* micro-exercise.** `λ₀ sin(πy/L)` is
  symmetric about `y = L/2`, so if P is placed on the perpendicular bisector at `(r, L/2)`,
  `E_y = 0` genuinely does hold — and this is a lovely contrast with 4.1.1, where it did
  not. Total charge `Q = ∫₀^L λ₀ sin(πy/L) dy = 2λ₀L/π` [verified by inspection:
  `λ₀(L/π)[−cos(πy/L)]₀^L = λ₀(L/π)(2)`]. Both of those are gradeable. The field is not.

If a second symmetric non-uniform density with a closed form is wanted, use
**`λ(y) = λ₀(1 − 4y²/L²)`** on `−L/2 ≤ y ≤ L/2` (a parabola vanishing at both ends), which
is symmetric, has `Q = 2λ₀L/3`, and integrates in elementary functions. With `P = (r, 0)` on
the bisector and `A = L²/4 + r²`:
```
E_x = kλ₀ [ L/(r√A) − (4r/L²)( 2 ln((L/2 + √A)/r) − L/√A ) ],     E_y = 0
```
(the two pieces are `∫dy/(y²+r²)^{3/2} = L/(r²√A)` and `∫y²dy/(y²+r²)^{3/2} = 2 ln((L/2+√A)/r) − L/√A`
over the symmetric interval). **[verified]** — direct Coulomb quadrature at three
`(λ₀, L, r)` triples agrees to `5.5×10⁻¹⁴`, `E_y` vanishes to `10⁻¹²`, and at `r = 400L` the field
is `kQ/r²` with `Q = 2λ₀L/3` to `3.6×10⁻⁷`. Machine form:
`'k*lambda0*(L/(r*sqrt(L^2/4+r^2))-4*r/L^2*(2*log((L/2+sqrt(L^2/4+r^2))/r)-L/sqrt(L^2/4+r^2)))'`.
Note that, like the `ramp`, this density needs `log` in the answer even though the geometry is
the plain `bisector`.

---

### Stage 2 — Generalisation and superposition

#### 4.2.1 `general-rod` — Finite rod with arbitrary endpoints

**Fits the schema, but needs two new parameters** (`y1`, `y2` in place of `size`). See §5.

**Why this earns its place, and why it should probably come first in Stage 2.** The app
currently has four separate rod problems (`bisector`, `axial`, `semi`, `endpoint`) plus
`infinite`. They are all special cases of one formula. Showing that is a *big* idea — it is
the difference between memorising five results and understanding one.

**Geometry.** Rod on the y-axis from `y = y₁` to `y = y₂` (either sign, `y₁ < y₂`), uniform
`λ`. `P = (r, 0)` — the origin is placed at the **foot of the perpendicular from P**, which
is the whole trick. Any rod, any P not on the rod's line, can be put in this frame.

**Charge element.** `dQ = λ dy`.

**Symmetry.** In general, *none*: `E_y = 0` if and only if `y₁ = −y₂`. The wizard's symmetry
step becomes a *conditional* — "under what condition on the bounds does `E_y` vanish?" —
which is a much better question than the fixed-answer version.

**Worked integration.** Both are already in the app, in pieces:
```
E_x = kλr ∫ dy/(y²+r²)^{3/2} = (kλ/r)[ y/√(y²+r²) ]_{y₁}^{y₂}
E_y = −kλ ∫ y dy/(y²+r²)^{3/2} = kλ[ 1/√(y²+r²) ]_{y₁}^{y₂}
```

**Closed form [verified].**
```
E_x = (kλ/r)( y₂/√(y₂²+r²) − y₁/√(y₁²+r²) )   = (kλ/r)(sin θ₂ − sin θ₁)
E_y = kλ( 1/√(y₂²+r²) − 1/√(y₁²+r²) )         = −(kλ/r)(cos θ₂ − cos θ₁)
```
with `θ` measured from the perpendicular. Numerically confirmed
(`y₁=−0.8, y₂=3.1, r=1.4, λ=1.9`): `E_x = 1.9101915`, `E_y = −0.6197480`, rel. err. `1×10⁻¹²`.

Machine forms (using `y1`, `y2` as symbols):
```
result:          'k*lambda/r*(y2/sqrt(y2^2+r^2)-y1/sqrt(y1^2+r^2))'
secondaryResult: 'k*lambda*(1/sqrt(y2^2+r^2)-1/sqrt(y1^2+r^2))'
```

**Limiting cases — these are the point of the problem.** Every one of them must reproduce
an answer the app already computes, which makes this the strongest regression target in the
whole document:

1. `y₁ = −L/2, y₂ = +L/2` → `E_x = kλL/(r√(r²+L²/4)) = kQ/(r√(r²+(L/2)²))`, `E_y = 0`.
   **Must equal `bisector`.**
2. `y₁ = 0, y₂ = L` → `E_x = kλL/(r√(r²+L²))`, `E_y = −kλ(1/r − 1/√(r²+L²))`.
   **Must equal `endpoint`.**
3. `y₁ = 0, y₂ → ∞` → `E_x = kλ/r`, `E_y = −kλ/r`, `|E| = √2 k|λ|/r`.
   **Must equal `semi` up to the axis relabelling.**
4. `y₁ → −∞, y₂ → ∞` → `E_x = 2kλ/r`, `E_y = 0`. **Must equal `infinite`.**

Pick two for the student-facing `limits` array (I recommend 1 and 4 — the two extremes) and
wire all four as tests.

**The tilted rod — assessed.** The task asked about "a rod at an arbitrary angle, where
neither component vanishes." My honest finding: **a tilted rod is this problem in disguise
and contains no new integral.** Drop a perpendicular from P to the rod's line; call its foot
the origin, the rod's direction `ŷ′` and the perpendicular `x̂′`; the integral is exactly the
one above. The tilt lives entirely in the final rotation back to lab axes.

That does *not* make it worthless — coordinate choice is a real skill, and step 1 of the
wizard already exists to teach it. But it should be presented as a **coordinate-frame
exercise built on `general-rod`**, not as a new derivation. Concretely: keep the same
integral, and add one step at the end, "rotate back to lab axes," with
`E_lab = R(β)·(E_x′, E_y′)`. That framing is honest and cheap; a separately-derived "tilted
rod" problem would be duplicated physics.

**Misconceptions.**

| Student writes | Feedback |
| --- | --- |
| Places the origin at a rod end and then uses `r` as the distance from that end | "r is the *perpendicular* distance from P to the rod's line, and the origin belongs at the foot of that perpendicular. Put it anywhere else and √(y²+r²) is no longer the distance to the element." |
| `E_y = 0` regardless of bounds | "E_y vanishes only when the rod is centred on the perpendicular, y₁ = −y₂. Drag the lower bracket off centre and watch the vertical arrow appear." |
| Sign error: writes `E_y = kλ(1/√(y₁²+r²) − 1/√(y₂²+r²))` | "Check the bounds order. The antiderivative is evaluated at the upper limit minus the lower limit. Your expression is the negative of the correct one — for a rod entirely above P it would push a test charge *up*, which is impossible." |
| For `y₁ < 0 < y₂`, doubles the `y₂` term instead of subtracting `y₁` | "sin θ₁ is negative when y₁ < 0, so subtracting it *adds*. That is not the same as doubling, unless the rod happens to be symmetric." |

**Citation.** Halliday/Resnick/Walker, ch. 22; Griffiths ch. 2 (Ex. 2.1 — Griffiths derives
exactly this in the `sin θ₂ − sin θ₁` form).

---

#### 4.2.2 `annulus` — Disk with a concentric hole

**Fits the schema, needs one extra parameter** (inner radius `a`).

**Why it earns its place.** It is the cheapest possible superposition problem and it reuses
`disk` exactly the way `disk` already reuses `ring` — the pattern the app has already
established and validated. Building it costs almost nothing.

**Geometry.** Flat annulus in the xy-plane, inner radius `a`, outer radius `b`, uniform `σ`.
`P = (0,0,z)`, `z > 0`.

**Two routes, and both should be offered.**
- **Direct:** `dQ = σ·2πs ds`, integrate `s: a → b`. Identical kernel to `disk`.
- **Superposition:** annulus = (disk of radius `b`) − (disk of radius `a`).

**Closed form [verified].**
```
E_z = 2πkσ z ( 1/√(z²+a²) − 1/√(z²+b²) ) = (σ z/2ε₀)( 1/√(z²+a²) − 1/√(z²+b²) )
```
Numerically confirmed (`a=0.7, b=2.4, z=1.1, σ=1.3`): `3.4878515` both ways, rel. err. `1×10⁻¹²`.
Machine: `'2*pi*k*sigma*z*(1/sqrt(z^2+a^2)-1/sqrt(z^2+b^2))'`.

**Limits.**
1. `a → 0` → `2πkσ(1 − z/√(z²+b²)) = σ/(2ε₀)(1 − z/√(z²+b²))`. **Must equal `disk`.**
2. `b → ∞` → `2πkσ z/√(z²+a²)` — an *infinite sheet with a hole*. Note this does **not**
   tend to `σ/(2ε₀)`; it tends to `σ/(2ε₀)·z/√(z²+a²) < σ/(2ε₀)`, and it goes to **zero** as
   `z → 0`. Sitting at the centre of the hole of an infinite punctured sheet, the field is
   zero. Very good check.
3. `z ≫ b` → `kQ/z²` with `Q = σπ(b² − a²)`. [Standard; **unverified numerically**, but
   follows from limit 1 plus the existing verified `disk` far-field.]

**Misconceptions.**
- `dQ = σ π s² ds` — "πs² is the area of the whole inner disk, not this thin ring." (reuse
  the existing `disk` text)
- `E = E_disk(b) + E_disk(a)` — "Superposition of a hole is *subtraction*. Adding the small
  disk would double-count the charge you removed."
- "The hole makes no difference because the removed ring's field cancelled anyway" —
  "Transverse fields cancel within each ring; the **axial** field does not. Removing the
  inner rings removes real, forward-pointing field."

**Citation.** OpenStax *University Physics Vol. 2* §5.5 (the disk derivation, extended);
Halliday/Resnick ch. 22 problems.

---

#### 4.2.3 `tworings` — Two coaxial rings

**Needs a new parameter** (separation) and a diagram change; otherwise fits.

**Geometry.** Two identical rings, radius `R`, charge `Q` each, coaxial, centred at
`z = ±a`. P on the common axis at height `z`.

**Superposition (no new integral).**
```
E_z(z) = kQ [ (z−a)/((z−a)²+R²)^{3/2} + (z+a)/((z+a)²+R²)^{3/2} ]        (like charges)
E_z(z) = kQ [ (z−a)/((z−a)²+R²)^{3/2} − (z+a)/((z+a)²+R²)^{3/2} ]        (opposite: +Q at z=+a)
```

**Like charges [verified numerically].**
- `E_z(0) = 0` **always**, for any separation, by antisymmetry. (`f(z) = kQz/(z²+R²)^{3/2}`
  is odd, so `f(−a) + f(a) = 0`.) Confirmed: `0.00e+00`.
- `dE_z/dz|₀ = 2f′(a) = 2kQ(R² − 2a²)/(a²+R²)^{5/2}`, which vanishes when **`a = R/√2`**,
  i.e. separation `= √2 R`. Confirmed numerically: `E′(0) = 1.1×10⁻⁸` at `a = R/√2`.
  At that separation the field near the midpoint is flat *and* zero to second order.

**On the "Helmholtz case".** The task listed "two coaxial rings including the Helmholtz
case". A precise statement matters here: **Helmholtz is a magnetic result.** For two
*current* loops (§4.4.6) the separation `= R` makes `B` maximally *uniform and non-zero* at
the centre. For two like-*charged* rings the centre field is identically zero regardless of
separation, and the flatness condition is separation `= √2 R`, not `R`. Implementing an
"electric Helmholtz coil" at separation `R` would be a physics error.

**Recommendation:** implement the electric two-ring problem for the `E(0) = 0` and
`√2 R` flatness results, and put the **actual Helmholtz configuration in the magnetic
stage (§4.4.6)** where it belongs. The pair makes an excellent contrast.

**Limits.**
1. `a → 0` → `E_z = 2kQz/(z²+R²)^{3/2}`. **Must equal `ring` with charge `2Q`.**
2. `z ≫ a, R` → `2kQ/z²`. Point charge of total charge `2Q`.

**Misconceptions.**
- "The field at the midpoint is twice one ring's field" — "Both rings' contributions at the
  midpoint are equal in magnitude and *opposite* in direction. They cancel exactly, at every
  separation."
- Uses separation instead of half-separation in the formula — "`a` is the distance from the
  midpoint to *one* ring, half the separation. Check: setting `a = 0` must reproduce a
  single ring of charge 2Q."
- "Helmholtz separation R makes E uniform" — "That is the *magnetic* Helmholtz condition.
  For charged rings the centre field is zero at every separation; the flat point is
  separation √2 R."

**Citation.** OpenStax Vol. 2 §5.5 (ring), superposed; Griffiths ch. 2 problems.

---

#### 4.2.4 `gapring` — Ring with a gap  *(low cost, high payoff)*

**Fits the schema.** Field at the **centre** of a ring of radius `R`, uniform `λ`, from
which an arc of angular width `δ` has been removed.

By superposition, full ring (field zero) minus the missing arc:
```
E = 0 − E_arc(δ)  ⇒  |E| = 2kλ sin(δ/2)/R,  pointing *toward* the gap
```
using the existing verified `arc` result `E_x = −2kλ sin(φ/2)/R`. **[Derived from an
already-verified result; the composition is algebraically trivial but should still be
numerically spot-checked at implementation.]**

**Limits.** `δ → 0` gives `E → 0` (complete ring). `δ = π` gives `2kλ/R` — a semicircle,
matching the existing `arc` half-limit. Small gap: `E ≈ kλδ/R = k(λRδ)/R² = kq_gap/R²` —
the field of a **point charge equal to the missing charge**, sitting on the ring. Lovely.

**Misconception targets.** "A small gap barely changes anything, so E ≈ 0" (true, and the
`kq_gap/R²` form says *how* small); "the field points away from the gap" (no — the gap is
*missing positive charge*, so it behaves like negative charge and attracts).

**Citation.** Irodov-style classic; reachable from OpenStax §5.5 + the existing `arc`.

---

#### 4.2.5 `dipole` — Two point charges

**Fits the schema only awkwardly** — it has no integral, so steps 2, 5, 6, 7 of the wizard
are vacuous. Recommend it as an **explorer-only** entry, or as the seed of a short
"superposition" flow.

Charges `+q` at `(0, +d/2)` and `−q` at `(0, −d/2)`; `p = qd`.
```
On the axis (y ≫ d):        E_y = 2kp/y³
On the perpendicular bisector (x ≫ d): E_x = −kp/x³   (antiparallel to p, and half the size)
```
**[Standard results, not machine-verified here. The factor-of-2 relationship and the
opposite sign are the load-bearing facts and should be checked numerically.]**

**Why it might still earn a place:** it is the missing rung between "point charge" and
"continuous distribution", it explains the `1/r³` far field of `cosring` (§4.1.3), and
"axial is twice bisector" is a classic exam fact. **Low priority.**

---

### Stage 3 — Electric potential

**This needs a wizard-flow variant, not just new entries** — but a *simplifying* one. See §5.3.

The eight steps become six: coordinates → charge element → one contribution
(`dV = k dQ/rᵢ`, a **scalar**) → reduce to one variable → bounds → integrate. **The symmetry
step and the projection step disappear**, and that absence is itself the lesson: potential
is a scalar, so there is nothing to cancel and nothing to project. A seventh optional step,
"differentiate back," recovers `E = −dV/dz` and closes the loop with a problem the student
has already solved.

I rate this the **highest-value stage in the document after Biot–Savart**, because it is
~15–20% of the exam, it is currently 0% covered, and it makes the existing content
*better* by giving every geometry a second, easier route.

#### 4.3.1 `v-ring` — V on the axis of a ring

Every element is the same distance `√(R²+z²)` from P, so the integral is trivial:
```
V = k∫dQ/√(R²+z²) = kQ/√(R²+z²)
```
**[verified]** — `R=1.6, z=0.9, Q=2.2`: `1.1984164` both ways, rel. err. `3×10⁻¹²`.

**The payoff step.**
```
E_z = −dV/dz = −kQ · d/dz (R²+z²)^{-1/2} = kQz/(R²+z²)^{3/2}
```
which is **exactly the existing verified `ring` result**. Confirmed by central difference:
`0.32005185` both ways, rel. err. `2×10⁻¹¹`. This is the single most satisfying moment
available in the app — a vector result the student ground out through projections and
symmetry, recovered in one line of differentiation.

**Limits.** (1) `z = 0`: `V = kQ/R ≠ 0`, while `E = 0`. Potential non-zero where the field
vanishes — the classic contrast. (2) `z ≫ R`: `V → kQ/z`, the point charge.

**Misconceptions.**
- Writes `V = kQ/z` — "That is the distance to the *centre*, not to the charge. Every
  element sits a distance √(R²+z²) away, and none of them is at the centre."
- Tries to project `dV` onto axes — "Potential is a scalar. There is no direction to
  project onto, and no cancellation to argue. That is why this integral is the easy one."
- Concludes `E = 0` at `z = 0` "because V = kQ/R is a maximum, and maxima have zero
  derivative" — actually correct here, and worth *rewarding*: `V(z)` is even in `z`, so
  `dV/dz|₀ = 0` necessarily. Give this one a "yes, and here is why that argument is
  general" response rather than a correction.
- Writes `E = +dV/dz` — "The minus sign is not cosmetic. Fields point from high potential to
  low; without it the field would point *toward* a positive charge."

**Citation.** OpenStax Vol. 2 §7.4, "Calculations of electric potential",
<https://openstax.org/books/university-physics-volume-2/pages/7-4-calculations-of-electric-potential>.

#### 4.3.2 `v-disk` — V on the axis of a disk

Built from rings, exactly as `disk` is built from `ring`:
```
dV = k(σ 2πs ds)/√(s²+z²)
V = 2πkσ ∫₀^R s ds/√(s²+z²) = 2πkσ [√(s²+z²)]₀^R = 2πkσ(√(z²+R²) − |z|)
  = (σ/2ε₀)(√(z²+R²) − |z|)
```
**[verified]** — `R=1.6, z=0.9, σ=1.4`: `8.2313395` both ways, rel. err. `3×10⁻¹²`.

**Payoff:** `E_z = −dV/dz = 2πkσ(1 − z/√(z²+R²))` for `z > 0` — the existing verified `disk`
result. Confirmed by central difference: `4.4838963` both ways, rel. err. `6×10⁻¹²`.

**Limits.** (1) `z = 0`: `V = σR/(2ε₀)` — finite, unlike the field's derivative
discontinuity. (2) `z ≫ R`: `√(z²+R²) − z ≈ R²/(2z)`, so `V → πkσR²/z = kQ/z`. (3)
`R → ∞` at fixed `σ`: `V` **diverges**. Honest and important — an infinite sheet has no
finite potential relative to infinity, only potential *differences*, `ΔV = −σΔz/(2ε₀)`.

**Misconceptions.** `|z|` written as `z` (breaks below the disk); using `πs² ds`; expecting
`V → σ/(2ε₀)` as `R → ∞` by analogy with the field ("the field converges, the potential does
not — that is why the sheet's potential is only ever quoted as a difference").

#### 4.3.3 `v-rod-bisector` — V on the perpendicular bisector of a finite rod

```
V = kλ ∫_{−L/2}^{L/2} dy/√(y²+r²) = kλ[ ln(y + √(y²+r²)) ]_{−L/2}^{L/2}
  = 2kλ · ln( (L/2 + √(L²/4 + r²)) / r )
```
(The simplification uses `(√A − L/2)(√A + L/2) = A − L²/4 = r²` with `A = L²/4 + r²`.)
**[verified]** — `L=2.6, r=1.15, λ=1.7`: `3.3002625` both ways, rel. err. `2×10⁻¹²`.

Machine: `'2*k*lambda*log((L/2+sqrt(L^2/4+r^2))/r)'`.

**Limits.** (1) `r ≫ L`: expanding the log gives `V → kλL/r = kQ/r`. **[verified
analytically in the series expansion above; recommend a numerical spot-check.]**
(2) `L → ∞` at fixed `λ`: `V → 2kλ ln(L/r) → ∞`. The infinite line has no finite absolute
potential; only `V(r₁) − V(r₂) = 2kλ ln(r₂/r₁)` is meaningful. **This is the single most
important lesson in the potential stage** and it falls out of a problem the student has
already solved for `E`.

**Misconceptions.** Dropping the `2` (integrating only half and forgetting to double);
writing `ln(L/2 + √(...))` without dividing by `r` (dimensionally illegal — "you cannot take
the logarithm of a length; the argument of a log must be a pure number, and that is exactly
why the r appears"); expecting a finite answer as `L → ∞`.

#### 4.3.4 `v-rod-axial` — V beyond the end of a rod

Rod `x: 0 → L`, P at `x = L + a`:
```
V = kλ ∫₀^L dx/(L + a − x) = kλ ln((a + L)/a)
```
**[verified]** — `L=2.6, a=1.3, λ=1.7`: `1.8676409` both ways, rel. err. `3×10⁻¹²`.

**Limits.** `a ≫ L`: `ln(1 + L/a) ≈ L/a`, so `V → kλL/a = kQ/a`. `a → 0`: `V → ∞`
logarithmically — touching a line of charge is a genuine (integrable-charge,
divergent-potential) singularity.

**Misconceptions.** Sign of the substitution `u = L + a − x` (yields `−ln u`, and students
frequently end with `ln(a/(a+L)) < 0`, a negative potential for positive charge — "check the
sign against physics: a positive rod cannot produce negative potential").

#### 4.3.5 `v-arc` — V at the centre of an arc  *(the contrast problem)*

Every element is a distance `R` from the centre, so
```
V = k∫dQ/R = kQ/R
```
**independent of the arc angle φ, and equal for a semicircle, a quarter-circle, and a
complete ring.** Meanwhile the existing verified `arc` result is
`E_x = −2kλ sin(φ/2)/R`, which *does* depend on `φ` and vanishes at `φ = 2π`.

**This pairing is the best argument in the app for why potential is worth learning.** Same
geometry, same charge, one quantity blind to the shape and the other exquisitely sensitive
to it. Put them side by side.

**Limits.** (1) `φ = 2π`: `V = kQ/R` but `E = 0`. (2) `φ → 0` at fixed `λ` (so `Q → 0`):
both go to zero; at fixed `Q` (charge compressed into a shrinking arc), `V` stays `kQ/R`
while `E → 2kλ... → kQ/R²`, the point-charge field.

**Misconceptions.** "The potential must be zero for a full ring because the field is" — the
central error the problem exists to correct: "E = 0 means V is *flat* there, not zero.
Flat at a high value is still a high value."

#### 4.3.6 Infinite line and semi-infinite line — **ΔV only**

Both have logarithmically divergent absolute potential. Do not offer a `V` result. Offer
instead:
```
V(r₁) − V(r₂) = 2kλ ln(r₂/r₁)      (infinite line)
```
and make the reference-point choice an explicit step. **[Standard; follows by integrating
the verified `infinite` field `E = 2kλ/r`; not separately machine-checked.]**

---

### Stage 4 — Biot–Savart

**Reuses the existing eight-step flow essentially unchanged.** See §3.2 for the argument.
The schema needs `mu0` and `I` as symbols and a `kind: 'current'` discriminator so the UI
says "current element" rather than "charge element" and draws arrows on the conductor.

Throughout: `dB = (μ₀/4π) I dl × r̂ / r²`, direction by the right-hand rule.

#### 4.4.1 `wire-finite` — Finite straight wire

**Geometry.** Wire along the y-axis from `y₁` to `y₂`, current `I` in `+ŷ`. `P = (d, 0, 0)`.
Origin at the foot of the perpendicular from P — same convention as `general-rod`.

**Current element.** `I dl = I dy ŷ`. Source-to-P vector `(d, −y, 0)`, `r = √(y²+d²)`.

**The cross product.** `ŷ × (d, −y, 0)/r = (0·0 − 0·(−y), 0·d − 0·0, 0·(−y) − 1·d)/r
= (0, 0, −d)/r`. So **every `dB` points in `−ẑ`** — into the page for a current flowing up
and a point to the right. Magnitude `dB = (μ₀/4π) I d dy/(y²+d²)^{3/2}`.

**Symmetry step.** There is nothing to cancel: all `dB` are parallel. That is *stronger*
than the rod's electric case and worth naming — the cross product has already done the
"projection" for you. (Compare: the rod's `dE` needed `cos α`; the wire's `dB` needs
nothing, because `dl ⊥ r̂`-decomposition is built into the cross product.)

**Integration.** Identical to `bisector`'s `E_x`:
```
∫ d dy/(y²+d²)^{3/2} = [ y/(d√(y²+d²)) ]
```

**Closed form [verified].**
```
B_z = −(μ₀I/4πd)( y₂/√(y₂²+d²) − y₁/√(y₁²+d²) ) = −(μ₀I/4πd)(sin θ₂ − sin θ₁)
|B| =  (μ₀I/4πd)|sin θ₂ − sin θ₁|
```
Sign convention: `−ẑ` for current in `+ŷ` and P on `+x̂`. Numerically confirmed
(`d=1.4, I=2.3, y₁=−0.8, y₂=3.1, μ₀/4π=1`): `−2.3123371` both ways, rel. err. `1×10⁻¹²`;
`B_x = B_y = 0` exactly.

Machine: `'-mu0*I/(4*pi*d)*(y2/sqrt(y2^2+d^2)-y1/sqrt(y1^2+d^2))'`.

**Limits.**
1. **Infinite wire**, `y₁ → −∞`, `y₂ → +∞`: `|B| = μ₀I/(2πd)`. **[verified]** — via a
   tangent substitution (a naive uniform grid over ±10⁶ does *not* converge; implementers
   should reuse the existing `sampleDistribution` tangent-Jacobian trick, which handles this
   correctly): `3.2857143` both ways, rel. err. `3×10⁻¹²`.
2. **Symmetric finite wire** of length `L`: `|B| = μ₀ I L/(4πd√(d²+L²/4))`, structurally
   identical to `bisector`'s `E_x = kλL/(r√(r²+L²/4))` under `kλ → μ₀I/4π`. Show them
   stacked.
3. **Semi-infinite wire** (`y₁ = 0, y₂ → ∞`): `|B| = μ₀I/(4πd)` — exactly half the infinite
   result, and a direct parallel to the existing `semi` problem's factor structure.

**Misconceptions.**

| Student writes | Feedback |
| --- | --- |
| `dB = (μ₀/4π) I dl/r²` with no `sin θ` | "The cross product carries a sine. Elements far along the wire are nearly *parallel* to r̂, and a current element contributes nothing directly along its own direction." |
| Applies `cos α` projection as in the electric case | "There is no projection to do here — every dB already points the same way. The cross product has done that work. What it added instead is the sin θ inside the magnitude." |
| `B = μ₀I/(2πd)` for a finite wire | "That is the infinite-wire result. A finite wire is *weaker* — check the sin θ₂ − sin θ₁ factor: it can never exceed 2, and 2 is what gives you the infinite answer." |
| `B` points radially outward from the wire | "B circles the wire; it is never radial. Point your right thumb along I and let your fingers curl — that is the direction, and it is perpendicular to both the current and the displacement." |
| Uses distance along the wire instead of the perpendicular distance for `d` | "d is the perpendicular distance from P to the wire's line, and the origin belongs at the foot of that perpendicular — the same convention as the charged rod." |

**Citation.** OpenStax *University Physics Vol. 2* §12.2, "Magnetic field due to a thin
straight wire",
<https://openstax.org/books/university-physics-volume-2/pages/12-2-magnetic-field-due-to-a-thin-straight-wire>.
Also Griffiths ch. 5, Ex. 5.5.

#### 4.4.2 `loop-axis` — Circular current loop on its axis

**Geometry.** Loop of radius `R` in the xy-plane, current `I` counterclockwise viewed from
`+z`. `P = (0, 0, z)`.

**Element.** `I dl` is tangential; the displacement to P is `(−R cos θ, −R sin θ, z)`, of
magnitude `√(R²+z²)`. Because `dl ⊥ r` always, `|dl × r̂| = dl = R dθ` — **no sine factor.**

**Symmetry — and the key novelty.** Each `dB` is perpendicular to both `dl` and `r`, so it
lies in the plane containing the axis and the element, tilted away from the axis. Opposite
elements cancel the transverse parts; the axial parts add. **The axial share is
`R/√(R²+z²)`, not `z/√(R²+z²)`.** At `R=1.6, z=0.9` those are `0.8716` and `0.4903`
respectively. The wizard's projection field should accept `R/sqrt(R^2+z^2)` and explicitly
reject `z/sqrt(R^2+z^2)` with targeted feedback (below).

**Integration.**
```
B_z = (μ₀/4π) I · R/(R²+z²) · R/√(R²+z²) · ∫₀^{2π} dθ  ... assembling carefully:
dB   = (μ₀/4π) I R dθ/(R²+z²)
dB_z = dB · R/√(R²+z²) = (μ₀/4π) I R² dθ/(R²+z²)^{3/2}
B_z  = (μ₀/4π) I R² (2π)/(R²+z²)^{3/2} = μ₀ I R²/(2(R²+z²)^{3/2})
```

**Closed form [verified].**
```
B_z = μ₀ I R² / (2 (R² + z²)^{3/2})
```
Numerically confirmed (`R=1.6, z=0.9, I=1.7`): `4.4200166` both ways, rel. err. `2×10⁻¹²`.
Machine: `'mu0*I*R^2/(2*(R^2+z^2)^(3/2))'`.

**Limits.**
1. **Centre**, `z = 0`: `B = μ₀I/(2R)`. **[verified]** — `6.6758844` both ways, rel. err.
   `6×10⁻¹²`. Contrast sharply with the charged ring, where the centre field is **zero**.
   That contrast is the best single teaching moment in Stage 4.
2. **Far field**, `z ≫ R`: `B → μ₀ I R²/(2z³) = μ₀ m/(2π z³)` with magnetic moment
   `m = IπR²`. A magnetic **dipole** — there is no magnetic monopole term, which is why the
   leading behaviour is `1/z³` and not `1/z²`. **[Standard; the `1/z³` scaling follows
   directly from the verified closed form. The `m = IπR²` identification is
   unverified-but-safe.]**
3. **No maximum away from the centre.** `dB_z/dz = −3μ₀IR²z/(2(R²+z²)^{5/2}) < 0` for
   `z > 0`, so `B` decreases monotonically from the centre — unlike the charged ring, whose
   `E` peaks at `z = R/√2`. Another direct contrast with existing content.

**Misconceptions.**

| Student writes | Feedback |
| --- | --- |
| Projection `z/√(R²+z²)` | "That was the *charged ring*. There, dE pointed from the element toward P, so the adjacent leg was z. Here dB is perpendicular to that line — it has been rotated 90° by the cross product — so the axial share uses the other leg, R." |
| `B = 0` at the centre "by symmetry, like the ring" | "Opposite elements of a charged ring push in opposite directions and cancel. Opposite elements of a current loop carry current in opposite directions *and* sit on opposite sides, and those two reversals cancel each other: every dB at the centre points the same way, along the axis." |
| Includes a `sin θ` factor | "dl is tangential and r points from the element to an axial point; those are always perpendicular, so sin θ = 1 for every element. This is one of the rare cases where the cross product contributes no angular factor at all." |
| `B_z = μ₀ I R/(2(R²+z²))` (one power of R short) | "Count the R's: one comes from the arc length R dθ and one from the projection R/√(R²+z²). Check your answer at z = 0 — it must give μ₀I/(2R), which has R in the denominator, not the numerator." |

**Citation.** OpenStax Vol. 2 §12.4, "Magnetic field of a current loop",
<https://openstax.org/books/university-physics-volume-2/pages/12-4-magnetic-field-of-a-current-loop>.

#### 4.4.3 `arc-b` — Arc at its centre of curvature

Arc of radius `R`, angular width `φ`, current `I`, P at the centre. Every `dl ⊥ r̂`, every
`dB` parallel:
```
dB = (μ₀/4π) I R dθ/R² = (μ₀ I/4πR) dθ
B  = μ₀ I φ/(4π R)
```
**[verified]** — `R=1.6, I=1.7, φ=2.1`: `2.2312500` both ways, rel. err. `4×10⁻¹²`.
Machine: `'mu0*I*phi/(4*pi*R)'`.

**Limits.** (1) `φ = 2π`: `B = μ₀I/(2R)` — matches 4.4.2's centre result. (2) `φ = π`
(semicircle): `μ₀I/(4R)`.

**The contrast to make explicit.** The charged arc gives `E ∝ sin(φ/2)`, which returns to
zero at `φ = 2π`. The current arc gives `B ∝ φ`, which grows monotonically and is *maximum*
at `φ = 2π`. Same geometry, opposite behaviour, because the electric contributions are
vectors that rotate with `θ` while the magnetic ones all point the same way. If Stage 4
ships only one problem beyond the straight wire, make it this one — it costs almost nothing
(the `arc` diagram already exists) and it lands the biggest idea.

**Misconceptions.** `B ∝ sin(φ/2)` (imported from the charged arc — "the electric
contributions rotate as you move along the arc; the magnetic ones do not"); `φ` in degrees
(the formula is radians-only, and `2π → μ₀I/2R` is the check); `μ₀I/(2πR)` (the infinite
*wire* formula applied to a loop).

#### 4.4.4 `solenoid` — Finite solenoid on its axis

**Built from loops exactly as `disk` is built from `ring`s** — this is the third instance of
the app's signature "reuse a derived result" pattern, and it should be presented as such.

**Geometry.** Radius `R`, from `z′ = −L/2` to `+L/2`, `n` turns per unit length, current `I`.
P on the axis at `z`. A slab `dz′` contains `n dz′` turns, i.e. current `dI = nI dz′`.

**Integration.**
```
dB_z = μ₀ (nI dz′) R² / (2(R² + (z−z′)²)^{3/2})
substitute u = z′ − z:  ∫ du/(R²+u²)^{3/2} = u/(R²√(R²+u²))
```

**Closed form [verified].**
```
B_z(z) = (μ₀ n I/2) [ (L/2 − z)/√(R² + (L/2 − z)²) + (L/2 + z)/√(R² + (L/2 + z)²) ]
       = (μ₀ n I/2)(cos θ₁ + cos θ₂)
```
Numerically confirmed against a 2×10⁴-loop sum (`R=0.4, L=3.0, n=50, I=1.3, z=0.7`):
`767.10977` both ways, rel. err. `3×10⁻¹⁰`.
Machine: `'mu0*n*I/2*((L/2-z)/sqrt(R^2+(L/2-z)^2)+(L/2+z)/sqrt(R^2+(L/2+z)^2))'`.

**Limits.**
1. **Long solenoid, at the centre** (`L ≫ R`, `z = 0`): `B → μ₀ n I`. **[verified]** —
   `R=0.05, L=20`: `816.804` vs `μ₀nI = 816.814`, rel. err. `1×10⁻⁵`. This is the result
   Ampère's law gives in one line (§4.5.9) and the cross-check between the two derivations
   is worth building.
2. **At the end** (`z = L/2`, `L ≫ R`): `B → μ₀ n I/2` — exactly half. **[verified]** —
   `408.406` vs `408.407`, rel. err. `3×10⁻⁶`. Students consistently expect the end field to
   be "a bit less"; that it is *exactly half*, for the same reason a semi-infinite wire gives
   exactly half, is a memorable structural fact.
3. **Single loop** (`L → 0` with `N = nL` fixed): must reduce to 4.4.2 with `I → NI`.

**Misconceptions.** Using `N` (total turns) where `n` (turns per length) belongs — "check
units: μ₀NI has units of B·m, not B; you need turns *per metre*"; expecting `μ₀nI`
everywhere inside ("that is the *infinite* solenoid; near the ends the field sags to half");
integrating over `θ` without the `dz′` Jacobian.

**Citation.** OpenStax Vol. 2 §12.7, "Solenoids and toroids",
<https://openstax.org/books/university-physics-volume-2/pages/12-7-solenoids-and-toroids>.

#### 4.4.5 `wire-thick` — see §4.5.9 (Ampère). Not a Biot–Savart problem.

#### 4.4.6 `helmholtz` — Helmholtz pair *(the real one)*

Two identical coaxial loops, radius `R`, current `I` the same way in both, centres at
`z = ±a`. Superposition of 4.4.2:
```
B_z(z) = (μ₀ I R²/2)[ 1/((z−a)² + R²)^{3/2} + 1/((z+a)² + R²)^{3/2} ]
```
`B` is even in `z`, so `B′(0) = 0` automatically. The **Helmholtz condition** is that
`B″(0) = 0` as well, which occurs at `2a = R` — separation equal to the radius. Then
```
B(0) = 8 μ₀ I / (5√5 R) ≈ 0.7155 μ₀ I / R
```
**[verified]** — `R=I=1`, `μ₀=4π`: `8.9917629` both ways, rel. err. `2×10⁻¹⁶`; and at that
separation `B′(0) = 0.0` and `B″(0) = −2×10⁻⁵` (numerical noise), confirming the flatness.

**Limits.** (1) `a → 0`: `B → μ₀I/R`, two coincident loops. (2) `a ≫ R`: the two loops
decouple and `B(0) → μ₀IR²/a³`.

**The contrast with §4.2.3 is the reason to build both.** Electric two-ring: field at the
centre is **zero at every separation**; flatness at `√2 R`. Magnetic two-loop: field at the
centre is **maximal and non-zero**; flatness at `R`. Same picture, opposite conclusion,
because `f(z) = z/(z²+R²)^{3/2}` is odd while `g(z) = 1/(z²+R²)^{3/2}` is even. That single
parity observation explains both, and it is a genuinely deep and genuinely teachable point.

**Misconceptions.** "Separation R makes the *electric* field uniform too" (no — §4.2.3);
"B is uniform *everywhere* between the coils" (no — flat to second order near the centre
only); adding the two loops' fields as scalars off-axis (valid on the axis only, where both
are axial).

**Citation.** Griffiths ch. 5 problems; OpenStax Vol. 2 §12.4 extended.

---

### Stage 5 — Gauss's law and Ampère's law

**Requires a new five-step flow** (§3.1). Grouped tersely here because the derivations are
short and standard; each still gets its limits and misconceptions.

#### 4.5.1 Spherical shell, radius `R`, charge `Q`
```
r < R:  q_enc = 0            ⇒ E = 0
r > R:  q_enc = Q            ⇒ E = kQ/r²
V(r>R) = kQ/r ;  V(r<R) = kQ/R (constant)
```
**Limits:** (1) the exterior field is *identical* to a point charge at the centre — the shell
theorem; (2) `E` jumps by `σ/ε₀` across the surface, and `V` is continuous. **[Standard;
`E=0` inside was not machine-checked but is implied by the verified solid-sphere check
below at `ρ` concentrated in a shell.]**

**Misconceptions:** "E = 0 inside because the shell shields it" (no — shielding is a
*conductor* effect requiring mobile charge; this holds for a uniformly charged insulating
shell purely by geometry); "V = 0 inside because E = 0" (the §4.3.5 error again);
"E just inside the surface ≈ E just outside" (it jumps discontinuously).

#### 4.5.2 Solid sphere, radius `R`, uniform `ρ`, total `Q`
```
r < R:  q_enc = Q r³/R³      ⇒ E = kQr/R³ = ρr/(3ε₀)     — linear in r
r > R:  E = kQ/r²
V(r<R) = kQ(3R² − r²)/(2R³) ;  V(r>R) = kQ/r
```
**[both verified]** — direct 3-D quadrature over 300³ volume elements at `r = 0.6R`:
`E = 2.51296` vs `kQr/R³ = 2.51327` (rel. err. `1×10⁻⁴`, consistent with the grid); and
`V(0.55R) = 1.3487897` vs `kQ(3R²−r²)/(2R³) = 1.348750` (rel. err. `3×10⁻⁵`).

**Limits:** (1) continuity at `r = R`: both branches give `kQ/R²`, and both potential
branches give `kQ/R` — the single most useful sanity check students can perform; (2)
`E → 0` linearly at the centre, not `1/r²` divergently; (3) `V(0) = 3kQ/(2R)`, exactly
1.5× the surface value.

**Misconceptions:** using the *total* `Q` inside (gives `kQ/r²` and a spurious divergence —
"only the charge *inside* your Gaussian surface counts; the shell outside contributes
nothing, by the shell theorem"); forgetting that `q_enc ∝ r³`; asserting `E` is discontinuous
at `R` (it is continuous here — it is discontinuous only across a *surface* charge).

#### 4.5.3 Infinite line — the cross-check
```
Cylinder of radius r, length ℓ:  E(2πrℓ) = λℓ/ε₀  ⇒ E = λ/(2πε₀ r) = 2kλ/r
```
**Must equal the existing `infinite` problem's verified result.** Build it as an explicit
"same answer, one line instead of a substitution" comparison — it is the best possible
motivation for why Gauss is worth learning, and the app is uniquely able to make it because
it already did the hard version.

#### 4.5.4 Infinite solid cylinder, radius `R`, uniform `ρ`
```
r < R:  E = ρ r/(2ε₀)
r > R:  E = ρ R²/(2ε₀ r) = λ/(2πε₀ r),  λ = ρπR²
```
**[Standard, algebraically parallel to 4.5.2; not machine-verified. Recommend a numerical
check at implementation.]**
**Limits:** continuity at `r = R`; the exterior form reduces to 4.5.3. **Misconceptions:**
using `4πr²` (spherical area) for a cylinder; forgetting the end caps contribute zero flux
*because* `E` is radial; `q_enc ∝ r³` instead of `r²`.

#### 4.5.5 Coaxial cable
Inner conductor `+λ` (radius `a`), outer shell `−λ` (radii `b`, `c`).
`E = 2kλ/r` for `a < r < b`; `E = 0` for `r > c`; induced `−λ` on the inner surface of the
shell. **[Standard.]** Excellent conductor-behaviour problem and the natural bridge to
§4.5.7's capacitance.

#### 4.5.6 Infinite slab, thickness `2d`, uniform `ρ`; and the conductor surface
```
Slab, |x| < d:   2EA = ρ(2xA)/ε₀   ⇒ E = ρx/ε₀
Slab, |x| > d:   2EA = ρ(2dA)/ε₀   ⇒ E = ρd/ε₀ = σ_eff/(2ε₀),  σ_eff = 2ρd
Conductor surface: pillbox with one face *inside the metal* where E = 0:
                  EA = σA/ε₀       ⇒ E = σ/ε₀
```
**[Algebra shown in full above; the slab exterior reducing to `σ_eff/(2ε₀)` is consistent
with the app's already-verified `sheet` result. Not separately machine-checked.]**

**This is the most valuable Gauss entry in the list**, because of the `σ/ε₀` vs `σ/(2ε₀)`
contrast. The app derived `σ/(2ε₀)` honestly, by integration, in the existing `sheet`
problem. It can therefore make the comparison in a way a formula sheet cannot: the factor
of 2 is *not* a different physical law, it is that one pillbox face contributes flux instead
of two, because the field on the metal side is zero.

**Misconceptions:** "a conductor's surface field is σ/(2ε₀) like a sheet" — the single most
common AP-C error, and the one this problem exists to kill; "the slab's interior field is
constant"; using `A` on both faces of the conductor pillbox.

#### 4.5.7 Capacitance from `ΔV = −∫E·dl`
```
Parallel plate:  C = ε₀A/d
Cylindrical:     ΔV = (λ/2πε₀) ln(b/a)   ⇒  C = 2πε₀ ℓ/ln(b/a)
Spherical:       ΔV = (Q/4πε₀)(1/a − 1/b) ⇒  C = 4πε₀ ab/(b−a)
```
**[both non-trivial cases verified]** — with `ε₀ = 1/4π`, `a=0.3, b=0.9, ℓ=2`:
cylindrical `ΔV = 2.1972246` (matches `(λ/2πε₀)ln(b/a)` to `9×10⁻¹³`) and
`C = 0.91023923` (rel. err. `9×10⁻¹³`); spherical `C = 0.45` exactly matching
`4πε₀ab/(b−a)`.

**Limits:** spherical with `b → ∞` gives `C = 4πε₀a` — an isolated sphere; cylindrical with
`b = a + t`, `t ≪ a` gives `ln(1+t/a) ≈ t/a` and `C → 2πaℓ ε₀/t = ε₀A/t`, the parallel-plate
result. Both are excellent checks.

**Misconceptions:** dropping the minus sign and getting negative capacitance; integrating
`E` over the wrong interval; "C depends on Q" (it does not — `Q` cancels, and demonstrating
that cancellation is the point).

#### 4.5.8 Field energy of a charged sphere
```
u = ½ε₀E²;   U = ∫₀^∞ u·4πr² dr,  using E from §4.5.2
U = 3kQ²/(5R) = 3Q²/(20πε₀R)
```
**[verified]** — split radial integral (inside directly, outside via `r = R/t`):
`U = 0.6000000` vs `3kQ²/5R = 0.6` with `k=Q=R=1`, rel. err. `3×10⁻¹²`.

A genuinely satisfying integral: the integrand is different inside and out, the exterior
piece needs a substitution to handle the infinite domain (which the app's tangent-Jacobian
sampler already knows how to do), and the answer is a clean rational multiple.
**Limits:** the same-charge shell gives `kQ²/(2R)`, smaller than `3kQ²/(5R)` — assembling
charge throughout the volume costs more than putting it all on the surface. `R → 0` diverges
— the classical self-energy problem, worth one sentence.

#### 4.5.9 Ampère's law — same flow, four applications
```
Infinite wire:              B(2πr) = μ₀I                   ⇒ B = μ₀I/(2πr)
Thick wire, r < R:          B(2πr) = μ₀I r²/R²             ⇒ B = μ₀Ir/(2πR²)
Infinite solenoid:          B·ℓ    = μ₀ (nℓ) I             ⇒ B = μ₀nI
Toroid, N turns:            B(2πr) = μ₀NI                  ⇒ B = μ₀NI/(2πr)
```
**[The infinite-wire case is verified** (§4.4.1 limit 1, rel. err. `3×10⁻¹²`) **and the
infinite-solenoid case is verified** (§4.4.4 limit 1, rel. err. `1×10⁻⁵`) **against
independent Biot–Savart quadrature. The thick-wire and toroid results are standard and
were not machine-checked.]**

The wire and solenoid cases are *cross-checks against Stage 4*, which is exactly the
relationship Gauss has to Stage 1–3. Building Ampère after Biot–Savart means every Ampère
result the app teaches has already been earned the hard way somewhere in the app.

**Misconceptions:** "B is uniform inside a toroid" (it falls as `1/r`); choosing an
Ampèrian loop on which `B` is not constant; forgetting that only current *threading* the
loop counts.

---

### Stage 6 — Flux and induction

The mechanic fits here better than the task's framing suggested, because **magnetic flux
through a region where `B` varies is a genuine one-variable integral over a distribution.**

#### 4.6.1 `flux-wire-loop` — Flux through a rectangular loop beside a long wire

**Geometry.** Long straight wire carrying `I`. Rectangular loop of dimensions `ℓ` (parallel
to the wire) × `w` (perpendicular), coplanar with the wire, near edge a distance `a` away.

`B` is *not* uniform over the loop — this is the whole point, and it is why a strip `dr` at
distance `r` is the right element, exactly as `dy` was for the rod:
```
dΦ = B(r) ℓ dr = (μ₀I/2πr) ℓ dr
Φ = (μ₀ I ℓ/2π) ∫_a^{a+w} dr/r = (μ₀ I ℓ/2π) ln((a+w)/a)
```
**[verified]** — `I=2, a=0.5, w=1.7, ℓ=1.1, μ₀=4π`: `6.5190600` both ways, rel. err. `8×10⁻¹²`.
Machine: `'mu0*I*l/(2*pi)*log((a+w)/a)'`.

**Limits.** (1) `w ≪ a`: `ln(1 + w/a) ≈ w/a`, so `Φ → μ₀Iℓw/(2πa) = B(a)·A` — the uniform
approximation, recovered exactly when the field barely varies across the loop. (2) `a → 0`:
`Φ → ∞` logarithmically. (3) Moving the loop away at speed `v` (so `a = a₀ + vt`):
`emf = −dΦ/dt = (μ₀Iℓ/2π) v w /(a(a+w))` — **[derived by the chain rule from the verified
Φ; the algebra should be re-checked at implementation.]**

**Misconceptions:** `Φ = B A` with `B` evaluated at the near edge, or at the centre ("B
varies by a factor of (a+w)/a across the loop — pick a strip and integrate"); missing `ℓ`;
using `ln(w/a)` instead of `ln((a+w)/a)`; putting the loop *perpendicular* to the wire's
plane and still getting non-zero flux ("if the loop's plane contains the wire's B-circles
edge-on, the flux is zero").

**Citation.** OpenStax Vol. 2 §13.2–13.3, Faraday's law and Lenz's law,
<https://openstax.org/books/university-physics-volume-2/pages/13-2-lenzs-law>.

#### 4.6.2 `rotating-rod` — Motional emf of a rod rotating about one end

Rod of length `L` rotating at `ω` about one end, in a uniform `B` perpendicular to the plane
of rotation. Each element at radius `r` moves at `v = ωr`, so the "distribution" is the
rod itself:
```
demf = (v × B)·dl = B ω r dr
emf = ∫₀^L Bωr dr = ½ B ω L²
```
**[verified]** — `B=1.3, ω=2.1, L=1.7`: `3.9448500` both ways, rel. err. `9×10⁻¹⁶`.

**Limits.** (1) Doubling `L` quadruples the emf — the outer half of the rod contributes
three-quarters of the total. (2) Equivalent flux-sweep view: in time `dt` the rod sweeps
area `½L²ω dt`, so `emf = B·dA/dt = ½BωL²` — the same answer by a completely different
route, and worth showing both.

**Misconceptions:** `emf = BLv` with `v = ωL` (gives `BωL²`, twice too big — "the tip moves
at ωL but the pivot does not move at all; you need the average, and averaging is what the
integral does"); `v = ωL` used for every element; forgetting `emf = 0` if `B` lies in the
plane of rotation.

#### 4.6.3 Sliding bar, self-inductance of a solenoid — **algebraic, low priority**
`emf = BLv`; `L_solenoid = μ₀n²(πR²)ℓ`. No integral to build. Include only as reference
cards if a Stage 6 lands.

---

## 5. Implementation cost

### 5.1 Blocking schema/whitelist changes (do these first, once)

| Change | File | Why | Size |
| --- | --- | --- | --- |
| Add `log` to `allowedFunctions` | `src/symbolic/equivalence.ts` | **Blocks all of Stage 3 and 4.1.1 and 4.6.1.** `mathjs` `log()` is natural log. Also extend `normalize()` to map `\ln`, `ln` → `log` | S |
| Add symbols `lambda0`, `mu0`, `I`, `d`, `b`, `n`, `y1`, `y2`, `rho`, `w`, `l`, `omega`, `dB`, `dV`, `dz`, `dl`, `dI`, `dphi` to `allowedSymbols` | `src/symbolic/equivalence.ts` | Every new stage needs some of these. Note `d` is currently **not** allowed, so any new problem must use `r` or `a` until it is added | S |
| Extend `substitutions()` with the new geometries' `Q ↔ density` relations | `src/symbolic/equivalence.ts` | Grading accepts either form, as it already does for `ring`/`arc`/`disk` | S |
| Add sampled-scope entries for new symbols in the grader's random-scope loop | `src/symbolic/equivalence.ts` | New symbols need physically sensible sample ranges (e.g. `y1 < y2`, `a < b`) or grading will produce false negatives | M |
| Widen `Params` beyond `{distance,size,charge,phi,...}` | `src/problems/types.ts` | `general-rod` needs `y1,y2`; `annulus` needs `a,b`; `tworings`/`helmholtz` need a separation; `solenoid` needs `n` and `L` independently. Suggest an open `extra: Record<string, number>` rather than growing the fixed record | M |
| Add `Limit['mode']` variants | `src/problems/types.ts` + `sampleLimit()` + `Assessment.tsx` | Each new limiting-case *plot shape* needs a mode and a figure. The existing seven modes cover far/infinite/center/half/full/scale/maximum; new needs include "continuity at a boundary" (Gauss) and "reduces to another problem" (general-rod) | M |
| Add `Problem.quantity: 'E' \| 'V' \| 'B' \| 'Phi'` | `src/problems/types.ts` | Drives labels, units, the component-vs-scalar branch, and which steps are shown | S |

### 5.2 Per-item cost

Sizes: **S** ≲ 100 lines and no new concepts; **M** touches 4–8 files; **L** needs a new flow
or renderer.

| Item | Files touched | Schema? | Size | Notes |
| --- | --- | --- | --- | --- |
| 4.1.1 `ramp` | `types.ts` (id), `more.ts`, `physics.ts` (field/numerical/sampleLimit), `sampling.ts`, `ChargeDiagram.tsx`, `Explorer.tsx` (glyph), `Assessment.tsx`, `progress.ts`, `equivalence.ts`, 5 test files | `log` + `lambda0` only | **M** | Reuses the `endpoint` geometry wholesale — diagram work is a density-shading overlay, not a new figure |
| 4.1.2 `quadratic` | same | none beyond 4.1.1 | **S** | Only if 4.1.1 landed |
| 4.1.3 `cosring` | same set | `lambda0`; needs signed-density rendering (blue/red halves) | **M** | Diagram change is real but small |
| 4.1.4 `sin(πy/L)` | — | — | — | **Do not implement as a wizard problem.** Explorer-only, or drop |
| 4.2.1 `general-rod` | same set + `EquationWorkbench.tsx` (bound expressions), `FieldBuilder.tsx` (`boundExpr`) | `y1,y2` params | **M–L** | The bound *handles* now move independently and can straddle the origin; `boundExpression()` needs generalising |
| 4.2.2 `annulus` | same set | inner radius param | **S–M** | Diagram = existing disk with a punched hole |
| 4.2.3 `tworings` | same set | separation param | **M** | New diagram (two rings in perspective) |
| 4.2.4 `gapring` | same set | none | **S** | Existing arc diagram, inverted highlight |
| 4.2.5 `dipole` | `Explorer.tsx` only, if explorer-only | none | **S** | Skip the wizard |
| **Stage 3 (V), all six** | all of the above **plus** a step-sequence variant in `more.ts`'s `make()`, plus `EquationWorkbench.tsx` (no projection row, scalar accumulation), plus `ChargeDiagram.tsx` (no arrows — draw a scalar heat/height readout instead) | `quantity:'V'`, `log` | **L** for the first, **S** for each subsequent | The first V problem is the expensive one; `v-ring`, `v-disk`, `v-arc` after it are cheap. The `E = −dV/dz` step is a new step type |
| **Stage 4 (Biot–Savart), all six** | same set + a `kind:'current'` branch in the diagram (arrows on the conductor, B out-of-page glyphs) | `quantity:'B'`, `mu0`, `I` | **L** for the first (`wire-finite`), **S–M** each after | `wire-finite` reuses `bisector`'s entire integral; `arc-b` reuses `arc`'s diagram; `solenoid` reuses the ring→disk composition pattern |
| **Stage 5 (Gauss/Ampère)** | **new flow module**, new renderer for nested closed surfaces, new step type, new grading targets (`q_enc(r)` as a function, piecewise results) | Large: piecewise `result`, a `regions` array | **L** (largest item in the document) | Genuinely a second product surface. High value, but do not start it until Stages 1–4 have proven the registry refactor (§6) |
| **Stage 6 (flux/emf)** | Stage-4 machinery + a "field over a region" sampler | `quantity:'Phi'` | **M–L** | Cheap *if* Stage 4 exists (it reuses `B(r)` of a wire); expensive standalone |

### 5.3 Which items need a new wizard flow rather than a new entry

- **Stage 3 (potential):** a *reduced* flow (6 steps + 1 optional). Same machinery, fewer
  steps. Low risk.
- **Stage 5 (Gauss/Ampère):** a *different* flow (5 steps, no integration in the main line).
  Genuinely new. High risk.
- **Everything else in Stages 1, 2, 4, 6:** new entries in the existing flow. No new flow.

---

## 6. Architecture recommendation

### 6.1 The current cost of one geometry

Adding `endpoint` (in flight during the writing of this document) required edits to, at
minimum:

```
src/problems/types.ts        ProblemId union
src/problems/more.ts         the definition
src/problems/definitions.ts  the PROBLEMS array
src/symbolic/physics.ts      field() switch, numerical() branch, sampleLimit() branches (×3)
src/symbolic/equivalence.ts  substitutions()
src/diagrams/sampling.ts     sampleDistribution() branch
src/diagrams/ChargeDiagram.tsx  ~15 separate `id === '…'` conditionals
src/explorer/Explorer.tsx    GLYPHS map
src/components/Assessment.tsx   LimitFigure branch
src/components/EquationWorkbench.tsx  bound expressions, component labels
src/wizard/FieldBuilder.tsx  boundExpr, icons array
src/state/progress.ts        the problemIds validation Set
+ 5–7 test files
```

That is **twelve source files plus tests for one geometry**, with the physics for a single
distribution smeared across at least six of them. Two agents cannot add two geometries
concurrently without conflicting in `physics.ts`, `sampling.ts` and `ChargeDiagram.tsx`.
This document proposes on the order of **twenty-five** new problems.

### 6.2 Recommendation: **yes, do the registry refactor — before Stage 1 ships more than
one problem.**

Concretely, one module per distribution:

```ts
// src/distributions/types.ts
export interface Distribution {
  readonly id: string;
  readonly definition: Problem;            // the existing shape, unchanged
  field(p: Params): Vec;                   // closed form
  quadrature(p: Params, n: number): Vec;   // independent numerical check
  sample(p: Params, count: number): ChargeSample[];
  draw(ctx: DrawContext): React.ReactNode; // the geometry-specific SVG
  glyph(): React.ReactNode;
  limitSample?(p: Params, limit: Limit, t: number): LimitPoint;
  limitFigure?(mode: Limit['mode'], t: number): React.ReactNode;
  boundExpression?(percent: number): string;
}
// src/distributions/index.ts
export const REGISTRY: Record<string, Distribution> = { bisector, axial, ... };
```

`ProblemId` becomes `keyof typeof REGISTRY` (still fully type-safe, still exhaustive at the
type level, but derived rather than hand-maintained). `field()`, `numerical()`,
`sampleDistribution()`, `sampleLimit()`, the glyph map and the `progress.ts` id set all
collapse to registry lookups.

**Why it is worth it here specifically, rather than being premature:**

1. **It converts a merge-conflict problem into a no-conflict problem.** Adding a geometry
   becomes: one new file, one line in the registry. That is the difference between "one
   agent at a time on geometries" and "five agents in parallel", which is the actual
   bottleneck this roadmap will hit.
2. **The switch statements are already at the size where they are hard to read.** `field()`
   is one line containing eight cases; `ChargeDiagram.tsx` has ~15 scattered `id === '…'`
   conditionals. At twenty-five problems these become genuinely unmaintainable, and the
   marginal cost of each addition grows rather than staying flat.
3. **The physics for one distribution should live in one place.** Right now the closed form,
   the quadrature, the sampler and the drawing for `disk` are in four files, and they must
   agree. The single most likely category of teaching-tool bug — a closed form and a
   sampler that disagree — is made *more* likely by that separation.
4. **Stages 3–5 introduce new `quantity` kinds** (`V`, `B`, `Φ`) that are not variations on
   `ProblemId` at all. Bolting a second axis onto the existing switch statements would
   produce a combinatorial mess. An interface handles it naturally: a potential problem is
   just a `Distribution` whose `field()` returns a scalar-carrying `Vec`.

**Cost.** Roughly one to two focused days for the eight existing geometries plus `endpoint`.
It is a large-surface but *mechanical* change: move code, do not rewrite it.

**Risk, honestly stated.**

- **The main risk is behavioural drift during the move**, especially in `ChargeDiagram.tsx`,
  where the geometry conditionals are entangled with camera, projection and layout code that
  is *not* per-distribution. Mitigation: extract `field`/`quadrature`/`sample` first (pure
  functions, fully covered by tests), and extract `draw` in a **separate, later** commit.
  Do not do both at once.
- **The 371-test suite is the safety net and it is a good one** — `ground-truth.test.ts`
  independently integrates each definition's own kernel string and compares against both the
  closed form and `field()`, so a physics regression during the move is caught. Treat the
  existing suite as a characterisation harness: **it must pass unchanged, with no test
  edits, at every step of the refactor.** If a test needs editing, the refactor changed
  behaviour and should be reverted.
- **The browser tests** (`diagram.browser.test.tsx`) iterate a hard-coded `ALL` id list;
  they will need one edit to read from the registry. That is the one acceptable test change.
- **Timing risk:** doing this while another agent is mid-flight on `endpoint` would be
  destructive. Sequence it *after* `endpoint` lands and *before* the second new geometry.

**If the recommendation is rejected**, the fallback that captures most of the value for a
fraction of the cost is to extract **only** `physics.ts` + `sampling.ts` into per-geometry
modules (the two files where concurrent geometry work actually collides most), and leave the
diagram, glyphs and limit figures as switches for now. That is a few hours and removes the
worst of the contention.

### 6.3 Recommended sequencing

```
0.  endpoint lands (in flight)
1.  §5.1 schema/whitelist changes           — unblocks everything, tiny
2.  registry refactor, physics+sampling     — half a day, no behaviour change
3.  registry refactor, diagram+glyphs       — separate commit
4.  Stage 1: ramp, cosring                  — proves the registry with real work
5.  Stage 3: v-ring, v-disk, v-arc          — highest curriculum value per unit cost
6.  Stage 4: wire-finite, arc-b, loop-axis, solenoid, helmholtz
7.  Stage 2: general-rod, annulus, gapring, tworings
8.  Stage 5: Gauss flow (spherical shell, solid sphere, cylinder, slab, conductor)
9.  Stage 6: flux-wire-loop, rotating-rod
10. Stage 5b: Ampère, capacitance, field energy
```

Rationale for putting Stage 3 before Stage 4 despite §3.2 calling Biot–Savart the highest
leverage: Stage 3 is *cheaper* (a reduced flow, not a new quantity domain), it makes the
existing nine problems better by giving each a scalar partner, and `E = −dV/dz` is the
single most satisfying payoff available. Stage 4 is the bigger win but the bigger build; do
the cheap win first and use it to shake out the registry.

---

## 7. Confidence register

**Machine-verified in this session** (brute-force quadrature vs. closed form, relative
errors as stated in each entry — all `< 3×10⁻⁵`, most `< 10⁻¹¹`):

- 4.1.1 `ramp` `E_x`, `E_y`, and both far-field limits (including the `y_cm = 2L/3` result)
- 4.1.2 `quadratic` `E_x`, `E_y`
- 4.1.3 `cosring` `E_x = −πkλ₀/R`, `E_y = 0`, and `Q_total = 0`
- 4.2.1 `general-rod` `E_x`, `E_y`
- 4.2.2 `annulus` `E_z`
- 4.2.3 `tworings` `E(0) = 0` and the `a = R/√2` flatness condition
- 4.3.1–4.3.4 `V` for ring, disk, rod-bisector, rod-axial; and `E = −dV/dz` recovering the
  existing verified `ring` and `disk` fields
- 4.4.1 finite wire (signed), infinite-wire limit
- 4.4.2 loop on axis, and the centre value `μ₀I/(2R)`
- 4.4.3 arc at centre `μ₀Iφ/(4πR)`
- 4.4.4 solenoid closed form; long-solenoid centre `μ₀nI` and end `μ₀nI/2`
- 4.4.6 Helmholtz `B(0) = 8μ₀I/(5√5 R)`, plus `B′(0) = B″(0) ≈ 0` at separation `R`
- 4.5.2 solid sphere `E` inside and `V` inside (3-D quadrature)
- 4.5.7 cylindrical and spherical capacitance
- 4.5.8 `U = 3kQ²/(5R)`
- 4.6.1 flux through a rectangular loop beside a wire
- 4.6.2 rotating-rod emf `½BωL²`

**Formerly unverified; machine-checked 2026-09-10 in `tests/spec-formulas.test.ts`.** Every
one of the sixteen items below was confirmed against quadrature of point sources written
fresh from the geometry (Coulomb / Biot–Savart, never the closed form under test). None was
wrong. The permanent harness runs with the unit suite; `SPEC_REPORT=1` prints this table.
Far-field checks are limited by genuine higher-multipole terms at the finite `D/R` used
(`300–500×`), not by quadrature; everything else is at `~10⁻¹⁰` or better.

| # | Item | Result | Achieved relative error |
| --- | --- | --- | --- |
| 1 | 4.1.3 limit 1 — `cos θ` ring dipole coefficient `p = πλ₀R² x̂` | **verified**: `+2kp/D³` on the `x`-axis, `−kp/D³` along `y` and along `z`, with no component along `D` in the transverse cases | `8.3e-6`, `4.2e-6`, `1.7e-5` at `D = 300R` |
| 2 | 4.1.3 limit 2 — `λ₀ sin θ` variant | **verified**: `E_y = −πkλ₀/R`, `E_x = 0` | `2.3e-15` |
| 3 | 4.1.4 alternative — `λ₀(1 − 4y²/L²)` | **derived and verified** — closed form now in §4.1.4 | `5.5e-14`; far field `kQ/r²` to `3.6e-7` |
| 4 | 4.2.2 limit 3 — annulus far field `kQ/z²`, `Q = σπ(b²−a²)` | **verified** | `5.1e-6` at `z = 400b` |
| 5 | 4.2.4 `gapring` — `2kλ sin(δ/2)/R` **toward** the gap | **verified**, including direction (`E_x > 0` for a gap on `+x`, `E_y = 0`) at `δ ∈ {0.3, 0.9, π, 4.5}`; small gap → `kq_gap/R²` | `2.5e-14`; small-gap `1.7e-5` at `δ = 0.02` |
| 6 | 4.2.5 `dipole` — `+2kp/y³` on axis, `−kp/x³` on the bisector | **verified**, ratio exactly `−2`, bisector field antiparallel to `p` | `2.0e-6`, `1.5e-6` at `500d` |
| 7 | 4.3.3 limit 1 — rod `V → kQ/r` | **verified** | `2.6e-7` at `r = 400L` |
| 8 | 4.3.6 — `ΔV = 2kλ ln(r₂/r₁)` for the infinite line | **verified** by integrating the *difference* of the two point potentials along the whole line (converges as `1/y³`) | `5.6e-12` |
| 9 | 4.4.2 limit 2 — loop far field `μ₀m/(2πz³)`, `m = IπR²` | **verified** | `1.7e-5` at `z = 300R` |
| 10 | 4.5.1 — spherical shell | **verified**: `E = 0` inside, `kQ/r²` radial outside, `V = kQ/R` at two interior points, `kQ/r` outside (2-D surface quadrature) | `1.7e-10` (inside, rel. `kQ/R²`), `1.8e-12`, `2.4e-11`, `1.9e-11` |
| 11 | 4.5.4 — infinite solid cylinder | **verified**: `ρr/(2ε₀)` at `r = 0.5R`, `ρR²/(2ε₀r)` at `2.5R`, radial (3-D quadrature, polar about `P`) | `1.3e-10` both |
| 12 | 4.5.5 — coaxial cable | **verified**: `E = 0` inside the inner conductor, `2kλ/r` in the gap, `0` outside **only** with `−λ` on the shell's inner surface (without it the exterior field is >10 % of the gap field — the induced charge is load-bearing) | `1e-16`, `1.3e-10`, `1e-16` |
| 13 | 4.5.6 — slab and conductor surface | **verified**: slab `ρx/ε₀` inside (two points), `ρd/ε₀` outside (two points); isolated sheet `σ/(2ε₀)`; a conducting slab with `σ` on each face gives **`σ/ε₀` outside and `0` inside** — the second face supplies the missing half, which is exactly the pillbox argument | `1.2e-10` throughout; interior `1e-16` |
| 14 | 4.5.9 — thick wire and toroid | **verified**: `μ₀Ir/(2πR²)` at `0.5R`, `μ₀I/(2πr)` at `2.5R`, azimuthal; toroid `μ₀NI/(2πr)` at three radii with `N = 720` discrete turns, exterior field `~0` | wire `1.3e-10` both; toroid `≤2.3e-15`, exterior `1e-15` |
| 15 | 4.6.1 limit 3 — receding-loop emf `(μ₀Iℓ/2π)·vw/(a(a+w))` | **verified** by central difference of a flux computed from direct Biot–Savart; sign positive as the flux falls | `1.7e-6` |
| 16 | 4.5.8 comparison value — shell self-energy `kQ²/(2R)` | **verified** as `½QV` with `V` the interior potential from item 10 | `2.1e-11` |

Also re-derived, not transcribed: the finite-wire sign — current in `+ŷ`, `P` on `+x̂` gives
`B_z < 0`, to `1e-12`.

**Sign conventions that must be re-derived, not copied, at implementation time:**

- The magnetic field of a straight wire is written here as `B_z < 0` for current in `+ŷ` and
  P on `+x̂`. That is correct for *this* coordinate choice and is easy to get backwards in
  another. Every Biot–Savart entry should have its direction re-established from the
  right-hand rule in whatever frame the diagram actually uses, not transcribed from here.
- `4.1.1`'s `E_y < 0` and `general-rod`'s `E_y` sign both depend on the rod lying at `y > 0`
  relative to P. Check against the existing `endpoint` implementation, which uses the same
  convention.

**Verification harness.** The scripts used for the checks above were throwaway. The right
permanent home for them is `tests/ground-truth.test.ts`, whose existing pattern — integrate
the definition's *own* kernel string over its *own* bounds and compare to its *own* stated
closed form — is exactly the right guard and should be extended to every problem added from
this document. **No problem in this document should ship without a row in that table.**
