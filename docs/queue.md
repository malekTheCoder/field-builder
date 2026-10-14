# Work queue

Everything the owner asks for lands here first, so nothing is lost and nothing jumps the line.
Work goes top to bottom through **Next**. Items move to **In progress** while someone works on them,
then to **Done**, with the commit. Newest requests are added at the bottom of **Next** unless the
owner says they are urgent.

## In progress
Where things stood on 2026-10-14 evening, in case the session resumes after a disconnect:
- **Codex round:** Codex stopped; Claude is landing it. Its 13 commits are on branch `codex/round` in the
  worktree `~/Developer/fb-codex-round` (rebased on f8ee8f7). Codex's own local suite passed (4118). To land it:
  rebase onto origin/main, run tsc + oxlint + the whole suite, push, remove the worktree and the branch.
- **Quiz questions for the other twelve shapes:** two agents in worktrees under `.claude/worktrees/`
  (rods and lines; disks, arcs and the sheet). Each pushes to main itself. If one died mid-way, its
  worktree has its files: finish, test, push. Then two physics reviewers check all the quiz's questions.
- **Redesign:** approved ([redesign-plan.md](redesign-plan.md)); starts once the Codex round is on main.
- Agents don't watch CI any more; Claude checks it every so often.

## Next
- **Lesson-to-lesson links feel broken** (e.g. "Take this rod to infinity" on the finite line). Clicking
  swaps the page to the related lesson (Explorer.tsx `related`, `exp-related`) with no visible
  sign: it jumps to the top, and the lesson list's highlight may be scrolled out of sight. Make it a
  clear "Next: <lesson> →" card with its glyph at the end of the lesson. On click, the new lesson
  visibly takes over: the lesson list scrolls to and highlights it, a short line says where you
  came from and why ("From the finite rod: let it run to infinity"), and there is a way back. This
  applies to every `link` in src/problems/*.ts (about a dozen). Start it after the Codex round,
  because both touch Explorer.tsx.

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
8. **Quiz yourself** (owner, 2026-10-13): its own page, not inside the lessons. The student picks the
   shapes, questions come from a bank, and personalized feedback follows. Plan:
   [quiz-plan.md](quiz-plan.md), waiting for the owner's OK.
9. **Design language redo** (owner, 2026-10-14): carry over the hiketalkstay rebuild's look (one grotesque,
   pure greys, an ink button, hairlines and no shadows, a rare accent) while the figure keeps its physics
   colours. Plan: [redesign-plan.md](redesign-plan.md), approved (Hanken Grotesk, teal accent, ink logo).
   Do it after the Codex round.

## Done
- Walkthrough (owner's answer, 2026-10-13): an old `seen` no longer hides it; "Don't show this again" and
  "Skip intro" on every page (a545d5e). Handouts already carry the limiting cases.
- Usage guard: stop at weekly 40% (owner, 2026-10-14) or 5-hour 90%; check get_usage before each round.
- Wave 5 (one critique round, five lanes) published as 04fd0a4: the handout teaches the method once, the
  tour's sum page is true on every lesson, the lead takes the subtitle's place, focus lands on the title,
  pairs join the sum at its head in 3D, quieter sheet rings, handles that cannot cross, one θ on a wide arc,
  and the panel's one notation per step. Full suite 4034 green.
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
