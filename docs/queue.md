# Work queue

Everything the owner asks for lands here first, so nothing is lost and nothing jumps the line.
Work goes top to bottom through **Next**. Items move to **In progress** while someone works on them,
then to **Done**, with the commit. Newest requests are added at the bottom of **Next** unless the
owner says they are urgent.

## In progress
- **Limiting cases: open by default and interactive.** Drag the dot along the curve, scrub the plot,
  the schematic moves with it, and words for each end. (agent)
- **Home page.** A landing page at the site root; the logo and the root link go there; ?p= lesson
  links still open lessons directly. (agent)

## Next
1. **Gauss's law, "coming soon" on the site.** A Gauss's law section shown as coming soon on the
   home page, in the lesson list and in the library. Do this after the home page lands. The plan is
   in [gauss-law-plan.md](gauss-law-plan.md); the section itself is not started.
2. **Ring, default 3D view, "Add them up".** The mirror-pair arrows come out small (~15–25 units).
4. **Wide arc (φ ≈ 1.8π), What cancels.** The label placer hides ΔE and "r_i = R", and the ghost
   names crowd.
5. **Ring's ΔE_z name** sits next to the stacked mirror survivor in a narrow fan (R small, z large,
   N large).
7. **Deferred by the cloud round (w4).** Not done in the round; still to do.
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
- The cloud round (w4) is merged (edb9c07): a sum link draws mirror pairs (was Next 3), the cube's face
  names are 11 px or more, initials where a word won't fit (was Next 6), the placer keeps the names the
  board is written in, and the round's panel, page, scene and content fixes. Its deferred and partial
  items are Next 7. Merging it also fixed: the placer's frame stops at the footer band (the ring's R sat
  on the divider on a phone), the projector layout's board is held to the window with a narrow margin
  (the ring's One piece outgrew it at 853 by 533), and the half line's board gives its lean for either
  sign. Its branches (claude/epic-cori-unu4i2, handoff/round-w4-notes, wip/w3-*) are deleted.
- View cube on a phone no larger than before the CAD cube (66f49e9): the bigger cube had pushed the
  ring's ΔE⊥ onto the y axis' letter at What cancels, and CI was red. The CAD cube itself is 2035537.
- The walkthrough opens on every visit until "Don't show this again" is ticked. Teacher links
  don't auto-open it, and the header button always does. (d648022) An old saved `seen: true`
  counts as "don't show", so returning visitors won't see it unless the owner wants that changed.
- View cube like a CAD tool's: drag anywhere on it to turn the view; faces, edges and corners are
  all targets; hover shows the target; picks glide.
- The figure fills its card, instead of leaving empty bands either side.
- "Add them up" sums symmetric lessons in mirror pairs. No more semicircle arc. (2fa24b3)
- The swarm's lanes integrate locally; one publisher deploys per batch, so no CI polling per fix.
