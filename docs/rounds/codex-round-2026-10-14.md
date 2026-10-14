# Codex critique and fix round, 2026-10-14

Baseline: `f4d3813` (`origin/main`). All implementation and temporary tests are in the isolated `fb-codex-round` worktree. This is one critique round, with five lenses and parallel figure, physics, student/accessibility and panel review. Queue, recent commit bodies, previous wave-five reports and curriculum were read before source changes. Findings below were recorded before their fixes.

Confirmed findings: **10** (WRONG 3, MISLEADING 2, CONFUSING 1, UGLY 4; BROKEN 0, POLISH 0). Locations identify the code inspected before each fix.

## Findings, worst first

### P1. WRONG: negative-charge potential plot has a signed denominator

- Where: `src/symbolic/physics.ts:167`, the arc-potential limiting plot's axis and reference labels.
- Evidence: at Q = -5 nC and R = 2 m, V = -22.46887948 V. The plot's magnitude ratio is +1, but its label `|V| ÷ kQ/R` evaluates to -1. The computation already uses the charge magnitude.
- Precise fix: label the denominator and reference `k|Q|/R`; retain the correct computation. Test the negative-charge ratio as well as the displayed label.

### P2. WRONG: the sheet lesson's bound assumes positive charge

- Where: `src/lessons/sheet.ts:22,30`, One ring and Add them up.
- Evidence: with sigma = -5 nC/m² and N = 3, the contributions are [-38.26362677, -104.53817241, -142.80179918] N/C. All violate the written upper bound -147.83930121 N/C. The signed contribution decreases with angle, whereas the prose says it grows.
- Precise fix: discuss the magnitude, bound every magnitude by `2πk|σ|Δα`, and use `NΔα = π/2` to make the finite bound independent of subdivision. Preserve the sheet's essential story: equal-angle far rings contribute more in magnitude.

### H1. WRONG: the home illustration conflates a pair with the whole rod

- Where: `src/home/Home.tsx:70-71,92`.
- Evidence: `/private/tmp/fb-codex-round-audit/access/home-light.png`. The two slant lengths are labelled r although they are 161.245 drawing units and the lesson's perpendicular distance r is 140. The arrow labelled E is only the outer mirror pair's sum, 0.32029794 of the five equal pieces' total at that scale.
- Precise fix: use r_i for the slant lengths and explicitly label the lower arrow as this pair's share of E. Retain the cancellation illustration and verify its projection numerically.

### P3. MISLEADING: potential growth statements are not sign-neutral

- Where: `src/lessons/v-disk.ts:41`, `src/lessons/v-arc.ts:37`.
- Evidence: at fixed sigma = -5 nC/m² and z = 1 m, increasing disk radius from 1 m to 4 m changes V from -116.95413829 V to -881.81595298 V. It decreases; its magnitude grows. The same sign issue applies to extending an arc at fixed negative line density.
- Precise fix: say the magnitude grows and the potential keeps the density's sign; numerically check both signs and zero.

### H3. MISLEADING: the home outline says every lesson uses point-charge pieces

- Where: `src/home/Home.tsx:45-48`, under “How every lesson goes”.
- Evidence: Home → disk student journey. The outline says every piece acts as a point charge; disk, sheet and disk-potential lessons use whole thin rings, and the disk lesson correctly says a ring is not a point charge and does not need to be.
- Precise fix: name simple pieces (short segments, small arcs or thin rings), then find their field or potential using Coulomb's law or a result already built. Keep this a short overview.

### H2. CONFUSING: offline copies still repeat exact equation displays

- Where: `src/state/artifact.ts:422-447,474`.
- Evidence: the all-lesson MathML audit in `/private/tmp/fb-codex-round-audit/access/run.log` finds exact repeated displays in infinite, ring, disk, v-ring, v-disk, v-rod-bisector and v-rod-axial. The previous round removed the duplicate five-stage narrative, but the subsequently authored lessons repeat equations in Working, The result or Differentiate back.
- Precise fix: print each identical display once, keep the explanatory working, and use explicit references to the original equation where it is needed again. Avoid empty result headings; test all fifteen offline copies.

### F1. UGLY: orbiting a ring or disk clips its near rim

- Where: `src/diagrams/ChargeDiagram.tsx:576-580`, bounded surface camera framing and zoom ceiling.
- Evidence: ring, disk and both potential twins at all four audit sizes. Nine ArrowUp presses reach pitch 1.3; the default ring's near rim projects to y = 296 + 2×42×sin(1.3) = 376.94 while the plot ends at 371. Charge marks extend farther. Before images: `/private/tmp/fb-codex-round-audit/figure/before/ring-1440-high.png`, `/private/tmp/fb-codex-round-audit/figure/before/ring-390-high.png`, `/private/tmp/fb-codex-round-audit/figure/before/v-ring-1366-high-cancel.png`.
- Precise fix: fit the shared projection origin to the current bounded surface extent, including its existing label allowance, preserving the opening composition and arrow scale. Limit bounded-surface zoom by the whole shape as well as P. Keep SVG and WebGL registered through the same origin.

### F2. UGLY: the sheet's charge formula overlaps its scale note on phones

- Where: `src/diagrams/ChargeDiagram.tsx:3543-3545` (after the camera fix).
- Evidence: `/private/tmp/fb-codex-round-audit/access/sheet-stage-3.png`, at 390×844 in One ring / What cancels. The finite-ring formula `ΔQ = σ 2πs z sec²α Δα` intersects “The ring’s arrow drawn larger” on the shared footer baseline.
- Precise fix: use concise scale notes on narrow figures, preserving both the full charge formula and the warning that arrows are enlarged. Measure the gap for the sheet and infinite line, both charge signs and the affected stages, and verify with new screenshots.

### T1. UGLY: the sheet's cancellation leaves a zero on its own line

- Where: `src/components/DerivationBoard.tsx:79` and `src/components/workbench.css:225-233`.
- Evidence: `/private/tmp/fb-codex-round-audit/matrix/panel/sheet-2d-390x844-s3end.png`. The implication ends the first line with `E_perp =`; its zero is orphaned on the next line, visually separating the answer from the quantity.
- Precise fix: keep the cancellation's final relation together as a single typesetting unit, allowing the break before the implication's conclusion. Preserve the formula and screen-reader mathematics; verify the relation remains on one line and fits the panel.

### F3. UGLY: the flat disk crowds its radius and integration limits on phones

- Where: `src/diagrams/ChargeDiagram.tsx:563-583,1666-1674,3256-3263`.
- Evidence: `/private/tmp/fb-codex-round-audit/matrix/disk-2d-390x844-s5end.png` and the corresponding JSON. In Shrink them, the `R` label intersects `s = 0` by 0.8×11.4 screen pixels, and `s` intersects `s = R` by 1.1×6.5 screen pixels. During Add them up their gaps are only 1.2 and 0.3 pixels. The figure's spare space is above the disk while its radius and bounds are crowded below it.
- Precise fix: reserve enough room for the flat disk's own radius dimension below its left half, keeping the selected-ring radius and integration bounds on the right. Preserve the figure scale and first-screen height; verify both signs, default and extreme geometry, and new phone screenshots.

## Completed coverage

All evidence is local, outside the disposable worktree: `/private/tmp/fb-codex-round-audit/`. The temporary audit sources are archived with it. No temporary `tests/zz-*` file is committed.

- **Figure and panel:** all fifteen lessons at rest and all five stages, at 1440×900, 1280×720, 1366×657 and 390×844. The 360 figure frames and 360 panel crops were inspected, with geometric label/arrow measurements alongside them (`matrix/`, `contact/`). Round-geometry 3D was inspected in 120 frames across the same four sizes, plus twelve dark frames, eight narrow-ring frames and twenty intermediate ring-pair frames (`figure/`). Animation frames were explicitly sought and paused, not inferred from a hidden browser's clock.
- **Capture limitation:** whole-panel phone screenshots contain blank bands outside the test iframe's visible viewport. Active-row crops and actual viewport captures were used to inspect those regions. The blank bands are capture artifacts, not product defects.
- **Physics:** independent integration and geometry calculations covered 567 parameter combinations, charge -5/0/+5, distance 0.5/3/6, length 1/4/8 (surface radius 0.5/2/4), opening 0.1π/π/1.8π/2π, and every piece count from 3 through 30. This checked 261,954 piece vectors, 5,292 mirror-pair plans and 3,159 limiting samples. Maximum relative discrepancies: field 8.44e-9, potential 7.01e-10, sample vector 5.03e-15, pair sum 5.93e-16, and potential derivative 9.92e-9. The implementation's field/potential functions, drawing vectors, pair plans, derivations, narration and lesson prose were reviewed together. No numerical formula or vector-direction defect was found. Script and results: `physics/audit.mjs`, `physics/numerical-audit.json`.
- **Confused student:** four complete journeys from Home, through reading, all five stages and board playback: bisector, disk, sheet and axial-rod potential. The thin-ring contradiction in Home was found during these journeys. Evidence: `access/`.
- **Page/accessibility:** keyboard entry and title focus, reading-to-run navigation, named controls, tour pages, Escape/focus return, dark phone view and print were checked. Body contrast was at least 14.12:1, muted text 6.21:1, active colored math 4.78:1 and stage titles 6.37:1. Three styled reduced-motion regressions passed, including intermediate cancellation and stepped progression. All fifteen offline handouts plus the alternate infinite-line route were audited for repeated rendered displays.
- **First screen:** all sixty lesson/viewport combinations passed. At 1280×720, Watch it build ended no lower than y=312.59 and Cut it up began no lower than y=644.70. At 1366×657, the complete drawing ended no lower than y=649.58. Page horizontal overflow was zero at every tested width. Actual viewport captures and measurements are in `screen/`; panel scrolling on short desktops remains intentional.

## Fix disposition

- **P1:** corrected the arc-potential magnitude reference to `k|Q|/R`. Negative-charge numeric and label regression passes.
- **P2:** expressed sheet contribution growth and the subdivision-independent bound in magnitudes. Both charge signs and zero checked numerically.
- **H1:** named slant distances `r_i` and identified the home arrow as the pair's share of the field. Numerical projection regression and styled Home screenshots verify it.
- **P3:** made disk/arc potential growth explicitly about magnitude while retaining the charge sign. Numerical regressions and six styled lesson screenshots verify it.
- **H3:** made the shared Home method include segments, arcs and thin rings, and both field and potential. Regression and Home journey screenshots verify it.
- **H2:** retained the first identical display in the handout, replacing later copies with explicit links to its lesson heading. All fifteen lessons and the alternate route have no duplicate rendered displays; explanatory prose and result headings remain.
- **F1:** fitted the shared SVG/WebGL origin and bounded-surface zoom to the complete projected shape. Camera regressions failed on the original near-rim clipping and pass after the change, with styled orbit screenshots at all four sizes.
- **F2:** shortened narrow-figure scale notes while retaining the complete charge formula and enlargement warning. A regression measures separation for seven geometries, both signs and two stages; before overlap was about 31 figure units. Styled phone captures show separation.
- **T1:** kept the implication and its conclusion together, with a permitted break before it. The regression failed on the orphaned zero before the fix; four cancellation boards now keep every equals-zero relation together without overflow. New styled evidence: `panel/sheet-390-cancel-after.png`.
- **F3:** reserved a separate radius-dimension row for the flat disk, preserving its scale and figure height. Default/extreme geometry, both signs, bound ownership and phone screenshots verify it.

The existing build-run test was updated to check finite `ΔQ` and absence of the limit before the last stage, rather than require the old scale-note wording. It still waits for the actual final limit. This preserves its behavioral assertion after F2. Existing camera-gesture tests now zoom out before zooming in, because a narrow ring legitimately opens at its safe zoom ceiling. They still verify wheel cancellation during zoom, both zoom keys, pad focus, reset and per-lesson camera isolation.

## Rejected candidates and remaining work

- Coarse finite-piece sums are intentionally approximations; their difference from the final integral is not a physics defect. Equal-radius ring potential is exact at every subdivision, as the lesson explains.
- Floating-point residue at a closed arc was negligible. The numeric audit included zero charge even though the interactive control deliberately skips it.
- The sheet-potential discussion already specifies its same-side context. The tour's focus on its interactive preview is deliberate. Neither warranted a change.
- The queued wide-arc label disappearance and the narrow-ring survivor label placement did not reproduce in the tested four-size/extreme cases. They are not counted as new findings or claimed fixed.
- **Remaining existing queue issue:** the default 3D ring's intermediate Add them up pair arrows remain small. Evidence: `figure/ring-pairs.jpg`. A focused change to pair readability is warranted, but changing its scale policy here would risk the verified mirror-pair normalization. This round preserves that policy and leaves the queue item open.
- The owner's study guide and quiz implementation arrived on main during this round and were preserved by rebasing onto `9422728`. They were outside this critique's baseline and were not implemented by this round. Subsequent rebases also preserve the owner's narrow-header fix, redesign planning, queue changes and updated site address. Next-lesson navigation is explicitly deferred by the owner's queue until after this round; the Gauss-law document remains a plan.

## Validation

- `npx tsc --noEmit`: passed.
- `npx oxlint`: passed.
- `npm run build:static`: passed (the existing large-chunk advisory remains).
- The complete pre-rebase run covered 181 files and 4,063 cases: 4,056 passed, one was skipped, and six old camera tests assumed zoom-in was always available. After updating those assumptions, all 38 tests in the three affected files passed. The earlier footer-wording assertion was also updated, and all 32 build-UI tests passed.
- All new regression files passed. Each reported defect was reproduced before its fix; visual fixes have new styled evidence.
- After rebasing onto `9422728`, type checking, lint and the static build passed again. The complete integrated suite passed: **186 files, 4,118 tests passed, one skipped**, in 1,444.35 seconds. The skip is pre-existing. Logs: `tsc-after-rebase.log`, `lint-after-rebase.log`, `build-after-rebase.log`, `tests-after-rebase.log`.
- The owner changed the completion plan: finish local checks, push the round and queue entry, then remove the worktree without waiting for GitHub Actions. CI follow-up is assigned to Claude; this report does not claim a green CI result.
