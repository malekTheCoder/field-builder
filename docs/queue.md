# Work queue

Everything the owner asks for lands here first, so nothing is lost and nothing jumps the line.
Work goes top to bottom through **Next**. Items move to **In progress** while someone works on them,
then to **Done**, with the commit. Newest requests are added at the bottom of **Next** unless the
owner says they are urgent.

## In progress
- **Limiting cases: open by default and interactive.** Drag the dot along the curve, scrub the plot,
  the schematic moves with it, and words for each end. (agent)
- **Walkthrough on every visit, with "Don't show this again".** (agent)
- **Home page.** A landing page at the site root; the logo and the root link go there; ?p= lesson
  links still open lessons directly. (agent)
- **View cube and figure width.** Committed locally, not yet pushed: the tests were still running.
- **Integrate the cloud round (w4).** The cloud session finished its round on GitHub branch
  `claude/epic-cori-unu4i2` (f7403ec = 183f166 + 23 commits). Its notes are on branch
  `handoff/round-w4-notes`: findings, TRIAGE.md and a styled harness. main has moved since then
  (the cube, plus the three agents' pushes), so this is a MERGE, not a fast-forward. Do it after
  the three local agents land.
  - Run tsc, oxlint, the WHOLE suite and build:static. Known cloud-container-only failures to
    compare against main: panel-board-order "current rᵢ² lights", and r2-figure-marks
    bisector/endpoint stage 3.
  - Fix the root causes, push main once, and check CI once.
  - Then delete wip/w3-*, handoff/round-w4-notes and claude/epic-cori-unu4i2.
  - Report to the owner and STOP.
  - The branch already covers queue items 3 (mode=sum mirror pairs) and 6 (view cube ≥ 11 px),
    and touches the cube, so expect overlap with the local cube work.

## Next
1. **Gauss's law, "coming soon" on the site.** A Gauss's law section shown as coming soon on the
   home page, in the lesson list and in the library. Do this after the home page lands. The plan is
   in [gauss-law-plan.md](gauss-law-plan.md); the section itself is not started.
2. **Ring, default 3D view, "Add them up".** The mirror-pair arrows come out small (~15–25 units).
3. **Sum mode outside the run.** (Done on the cloud branch.) A teacher link with mode=sum still draws the old tip-to-tail
   chain. Use mirror pairs there too.
4. **Wide arc (φ ≈ 1.8π), What cancels.** The label placer hides ΔE and "r_i = R", and the ghost
   names crowd.
5. **Ring's ΔE_z name** sits next to the stacked mirror survivor in a narrow fan (R small, z large,
   N large).
6. **View cube on phones.** The face names are 8–10 px. (Done on the cloud branch: ≥ 11 px.)
7. **Deferred by the cloud round.**
   - New lessons: a non-uniform semicircle, a spherical shell, an annulus, an off-bisector rod.
   - Lay the semi-infinite line along y, like its parent rod.
   - Infinite line's angle θ → α.
   - The offline copy's figure at the One-piece frame.
   - Keep a dragged bracket when Watch it build starts.
   - A `view=2d|3d` link key.
   - Partial: the ring's What-cancels piece is 73 px (target 90).
   - Partial: Q<0 rods' ΔE_x on the r leg.
   - Partial: v-rod-bisector in 3D drops its labels.
   - Partial: webglcontextlost is not handled.
   - Partial: Shrink's rule still says "thinner without end".
8. **Usage guard (set).** Check plan usage (the get_usage tool) before each round and at each wake-up. Stop at weekly ≥ 30% or 5-hour ≥ 80%.
   Pause the agents once the 5-hour window passes the owner's chosen percent; the threshold is
   still to be confirmed.

## Done
- View cube like a CAD tool's: drag anywhere on it to turn the view; faces, edges and corners are
  all targets; hover shows the target; picks glide.
- The figure fills its card, instead of leaving empty bands either side.
- "Add them up" sums symmetric lessons in mirror pairs. No more semicircle arc. (2fa24b3)
- The swarm's lanes integrate locally; one publisher deploys per batch, so no CI polling per fix.
