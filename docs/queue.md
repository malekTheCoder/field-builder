# Work queue

Everything the owner asks for lands here first, so nothing is lost and nothing jumps the line.
Work goes top to bottom through **Next**. Items move to **In progress** while someone works on them,
then to **Done**, with the commit. Newest requests are added at the bottom of **Next** unless the
owner says they are urgent.

## In progress
Nothing. (2026-10-15: everything below Done is on main and CI is green on 5465a3a.)

## Next
1. **New lessons**, deferred by the cloud round, for the owner to choose from: a non-uniform semicircle, a
   spherical shell, an annulus, a rod with P off its bisector.
2. **Gauss's law lessons**: plan in [gauss-law-plan.md](gauss-law-plan.md); shown as coming soon on the
   site. Not started until the owner says so.
3. A critique round on the redesigned site, when the owner wants one.

## Done
- 2026-10-15 batch (all on main, CI green on 5465a3a):
  - Quiz yourself: all fifteen shapes (8b172fb, b04aa49), physics-reviewed (518c953, 95e7b3e).
  - Redesign after hiketalkstay (232457a..9de4823) and its QA fixes (8193c49, 7116ede, 8820410).
  - The Next card and the came-from line (4420bba); Gauss's law coming soon (9841729).
  - 3D: ring pairs, rod labels in space, context loss, view=2d|3d links (4ee46c8..65b9ef2, 7662658).
  - The infinite line's α (a66b6d2), the semi-infinite line along y (f2576d1), Shrink's wording (695ee83,
    a14b334), and their physics review (10dc727).
  - 2D figure: negative rods' legs, the ring's What-cancels piece, a dragged bracket kept, the handout at
    One piece, semi's ∞ on phones (4b644fb..3d3b9ff); wide arc and narrow ring not reproduced (5465a3a).
- 2D-figure leftovers (2026-10-15; was Next 4, 5 and four of Next 7's bullets), five commits. A negative rod's
  ΔE_x lay on the r leg and the leg was painted over it: the leg now stops at the arrow's point, ΔE_x is named
  beside its own shaft and r beside the bare leg, y kept on its own leg (4b644fb). The ring's What-cancels piece
  73 → 89 px at 1280 × 720, the run's own readable length (105 at 1440 × 900): the stacked pair up its axis was
  held under the axis' letter, which in space stands beside the axis; P, the ring and the scale unmoved
  (fe6b6ec). Watch it build keeps a dragged bracket: the run's piece is inside it, What cancels draws a mirror
  only where it is bracketed too, Add them up and Shrink them are the bracketed part's, and the transport writes
  the panel's bracketed board and answer (src/workbench/bracket.ts, shared) (28c6d7a). The semi-infinite line's
  ∞ is kept beside ΔQ at the top break on a phone (3d3b9ff). The offline copy's figure is One piece's, the run's
  piece with its rᵢ and ΔE, drawn off screen (ac877f8). Not reproduced, at φ 1.8π, 1.9π and 2π (R ½, N 30, either
  sign, laptop and phone) and the ring at R ½, z 4 to 6, N 20 to 30: the wide arc's ΔE and rᵢ = R are never
  hidden and its ghost names do not crowd (at φ = 2π, Q < 0 on a phone rᵢ = R stands just over P, touching,
  readable); the ring's ΔE_z stands beside its own part, below the stacked mirror survivor. Shots in the session
  scratchpad, fig/.
- Line family consistency (2026-10-15), three commits: the infinite line's angle at P is α everywhere, as in
  every other lesson (a66b6d2); the semi-infinite line stands up the y-axis from its end with P = (r, 0) level
  with it, the endpoint rod grown long, E = (kλ/r)(x̂ − ŷ), checked against a brute-force point-charge sum for
  both signs (f2576d1); Shrink them opens on N → ∞ in the board's rule, the captions and the lessons, as its run
  line does (695ee83). The home page's "Make the pieces smaller without end" (src/home) is left as it is.
- Redesign QA fixes (2026-10-15): the report's findings in .claude/loop/reports/redesign-qa.md, worst first. One type
  scale in the chrome (14 for labels, 16 for reading, 600 for headings and labels only), one link (ink, a teal
  hairline under it, teal on hover), one dialog (600 wide, one padding, a 24 title, the Close in its own row), one
  disclosure (a right-hand chevron), one radius pair; print in one column with no grey band; the quiz's wrong answer
  in ink with a cross; the library's glyphs grey; the limit plot in a hairline card; a readable disabled Reset view.
  Skipped: the sidebar's potential labels (lessons.tsx is another lane's) and the view cube's steppers (already
  carry a hit circle). Before and after shots in the session scratchpad, qa-fixed/.
- 3D round (2026-10-15), four commits: the ring's mirror pairs in space at one readable enlargement, fitted
  once in the opening view, the same for every pair (4ee46c8; the default ring's second pair 31 → 42 units,
  the half pieces 15 → 22, all three at 2.48x; the flat figure unchanged); the rod on its bisector keeps L, r,
  ±L/2, Δy, y and dy in space, on true segments (0133d7c; was Next 7); a lost WebGL context draws the figure
  flat with a line saying why, 3D left on offer (ca923dc; was Next 7); and a `view=2d|3d` link key, written
  where the view is not the lesson's own and carried by Copy a link (65b9ef2; was Next 7).
- Codex round (2026-10-14), landed by Claude: 13 commits ending 781d631, report in
  docs/rounds/codex-round-2026-10-14.md. Ten findings fixed (signed potential label, the sheet's bound and
  two potential sentences for negative charge, the home cover's r_i and pair share, phone and 3D framing).
  Unit 3090 and tsc green after the rebase; CI not yet checked.
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
