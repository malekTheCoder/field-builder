# Work queue

Everything the owner asks for lands here first, so nothing is lost and nothing jumps the line.
Work goes top to bottom through **Next**. Items move to **In progress** while someone works on them,
then to **Done**, with the commit. Newest requests are added at the bottom of **Next** unless the
owner says they are urgent.

## In progress
- **Critique round, wave 5: PAUSED** (owner went offline, 2026-10-13). Four lanes' fixes wait on the local
  branch `swarm` (content, page, scene, figure); the panel's is on `paused/w5-panel`, not yet integrated.
  To finish: integrate the panel, run the whole suite, publish swarm to main, check CI. Then the owner runs
  one Codex round ([codex-round-prompt.md](codex-round-prompt.md)). Usage cap: weekly 40%, 5-hour 90%.

## Next
- **Lesson-to-lesson links feel broken** (e.g. "Take this rod to infinity" on the finite line). Clicking
  swaps the page to the related lesson (Explorer.tsx `related`, `exp-related`) with no visible
  sign: it jumps to the top, and the lesson list's highlight may be scrolled out of sight. Make it a
  clear "Next: <lesson> →" card with its glyph at the end of the lesson. On click, the new lesson
  visibly takes over: the lesson list scrolls to and highlights it, a short line says where you
  came from and why ("From the finite rod: let it run to infinity"), and there is a way back. This
  applies to every `link` in src/problems/*.ts (about a dozen). Start it after the CI run-perf fix
  lands, because both touch Explorer.tsx.

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
9. **A lesson at the top of every lesson** (owner, 2026-10-13). Before the figure, teach the concept the
   way a textbook does, then the page shows it. Original prose (no copied textbook text), with
   "read more" pointers to textbook sections (OpenStax University Physics is free; Griffiths,
   Purcell). On the site: a lead that is always shown, and "Read the lesson" opens the whole of it, so the
   figure stays on the first screen. Also in the printout and the offline handout. Plan: one agent
   builds the frame and the finite line's lesson; two agents write the other fourteen; two physics
   reviewers check them.
   Frame and the finite line's lesson done (0deeff0); the other fourteen wait on the owner's look.
10. **Walkthrough (owner's answer, 2026-10-13).** An old `seen` no longer hides it: returning readers
   get the new tour, with "Don't show this again" and "Skip intro" on every page. Handouts: the
   limiting cases are already in them, kept simple.
11. **How to use this site** (owner, 2026-10-13): a guide to actually learning with it, not a feature tour.
   The plan goes to the owner first; build only once they approve. Best after the fourteen lessons land.
   Owner (2026-10-13): it must teach ACTIVE study, not rereading: quiz yourself, predict, recall.
12. **Quiz yourself** (owner, 2026-10-13): its own page, not inside the lessons. The student picks the
   shapes, questions come from a bank, and personalized feedback follows. Plan:
   [quiz-plan.md](quiz-plan.md), waiting for the owner's OK.

## Done
- All fifteen lessons are written and physics-reviewed (601aac8, 3cf1fb6, 26c3a11; reviews 5286115,
  6adbdb2, 0f272b0). The reviewers fixed: a ring piece called a point charge, a factor of two in the disk's
  integral, the arc potential's φ claim, the rod-on-axis far fields measured from the end, the bisector's
  lone middle piece, sign-dependent "grows", and Purcell's chapter title.
- No em dashes on the site (owner, 2026-10-13): every visible sentence that used one now uses a comma,
  colon, brackets or a full stop; tests/no-em-dash.test.ts keeps them out. Comments may still use them.
- CI green again, Pages deploying (d55dcb4, run 38389216435). The ring's run-perf failure was not a
  regression on CI's path: on the same runner the merged and pre-merge ring cost the same, and CI
  machines differ about fourfold. Most of each CI frame was React's dev build capturing an owner-stack
  Error and console task per element -- only for the first 10k elements per wall-clock second, so a
  slow runner pays it on far more elements and the cost grows faster than the machine slows (the
  "different timeline" was a lesson difference: ring/infinite are 101/135 frames, rod/disk 112/124,
  on CI and here alike). The test now turns owner stacks off for the frames it times and measures each
  stage's p95 against a render-and-layout workload timed in the same page (budget 8 units; the worst
  stage measures 3.4-5 on the Mac, throttled 2x/4x, a Linux container and CI); the counts stay as the
  regression guards. Profiling also found real waste, fixed: in space the ring rebuilt its hidden flat
  pieces, cuts and growing cuts on every frame; the cuts are no longer built there and the pieces
  (still the click targets) are kept between frames (ChargeDiagram `RingHits`; it landed inside
  9bb3672, another session's commit from the shared checkout).
- The home cover shows the cancelling (776fe44): both mirror pieces, their two ΔE arrows at P, the parts
  across the axis struck through as "cancel", and the parts along it laid end to end as E.
- The cloud round (w4) is merged (edb9c07): a sum link draws mirror pairs (was Next 3), the cube's face
  names are 11 px or more, initials where a word won't fit (was Next 6), the placer keeps the names the
  board is written in, and the round's panel, page, scene and content fixes. Its deferred and partial
  items are Next 7. Merging it also fixed: the placer's frame stops at the footer band (the ring's R sat
  on the divider on a phone), the projector layout's board is held to the window with a narrow margin
  (the ring's One piece outgrew it at 853 by 533), and the half line's board gives its lean for either
  sign. Its branches (claude/epic-cori-unu4i2, handoff/round-w4-notes, wip/w3-*) are deleted.
  Follow-ups for CI's ring run-perf budget: the placer asks only the strokes a spot can reach (bd3f48a;
  the round's stricter placer had tripled its cost), and the open limits card no longer re-sums its
  plot on every frame of Shrink them (2413d86).
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
