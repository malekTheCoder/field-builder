# One critique → fix round (prompt for Codex)

Paste everything below the line into Codex, running on this Mac in `~/Developer/field-builder`.
Don't start it while a Claude round is running on the same files. Check `git worktree list` and the
queue's "In progress" section first.

---

You are doing ONE critique-then-fix round on **field-builder**, then merging your work to `main`.
Work in your own git worktree, critique the whole site through five lenses, fix the worst real
problems, test everything, merge, push, and confirm CI is green.

## The project and the owner's bar
- **What it is:** an interactive electric-field teaching site for first-year university E&M (and AP
  Physics C). A student picks a charge shape (rod, ring, disk, arc, sheet, and the potential versions)
  and learns to build the integral for its field or potential at a point P.
- **Where it lives:**
  - Repo: `~/Developer/field-builder`, GitHub `malekTheCoder/field-builder`, remote on SSH.
  - Live: https://learnem.malekswilam.dev via GitHub Pages.
  - CI: `.github/workflows/pages.yml` runs on every push to `main`: `tsc`, `oxlint`, `npm test` (all
    vitest projects) and `npm run build:static`, then deploys. A red suite means no deploy.
- **The owner's bar is textbook quality:**
  - no physics mistakes;
  - no overlapping, clipped or orphaned text;
  - nothing that looks amateur;
  - it genuinely helps a confused student;
  - a lecturer would assign it and project it.
- **Pages stay simple around the two things that matter:** the figure and the "Build the integral"
  panel.

## 0. Set up a worktree (do ALL your work there)
```
cd ~/Developer/field-builder
git fetch origin
git worktree add ../fb-codex-round -b codex/round origin/main
cd ../fb-codex-round
ln -s ~/Developer/field-builder/node_modules node_modules
```
- Never edit the main checkout `~/Developer/field-builder`, except to remove the worktree at the end.
- Never `git add -A` or `git add .`: stage explicit paths.
- Never commit files named `tests/zz-*`.
- Never force-push. Never rewrite pushed history.
- Do not start a dev server; port 3000 is the owner's.

## 1. Read first (in this order)
1. `docs/queue.md`: the work queue. Skip anything under "In progress". Don't re-raise anything under
   "Done" unless it is still visibly broken.
2. `git log --oneline -40`: recent work, with reasons in the commit bodies.
3. The previous round's critic reports, so you don't repeat them. They are local only, not in git:
   `~/Developer/field-builder/.claude/loop/reports/w5-*/*.md`, with fix notes in
   `~/Developer/field-builder/.claude/loop/reports/LOG.md` (the last ~40 lines).
4. `docs/curriculum-spec.md`: what each lesson teaches.
5. Then the code, using the file map below. Comments in this codebase are long prose about WHY a thing
   is the way it is. Read them before changing anything: most "odd" choices are deliberate and
   explained.

## 2. File map

**Lessons and their content**
- `src/problems/definitions.ts`: the 15 lessons (`PROBLEMS`) and `getProblem(id)`.
  - Ids: bisector, axial, endpoint, ramp, infinite, semi, ring, disk, arc, sheet, v-ring, v-disk, v-arc,
    v-rod-bisector, v-rod-axial.
- `src/problems/more.ts`: each lesson's title, subtitle, setup, steps, answers, common mistakes and
  limiting cases.
- `src/problems/prose.ts`: keeps short formulas from breaking across lines.
- `src/problems/readiness.ts`: which lessons are live (all are).
- `src/problems/types.ts`: the types.
- `src/distributions/*.ts`: each geometry's charge layout and exact field/potential (ring.ts also has
  the arc; disk.ts also has the sheet; infinite.ts also has semi; potential.ts has the V lessons).
- `src/lessons/<id>.ts`: the textbook-style lesson at the top of each page. It has a lead, sections
  following the run's stages, and a reading list. `index.ts` and `types.ts` are the registry and the
  type. All 15 were physics-reviewed on 2026-10-13.
- `src/symbolic/physics.ts`, `equivalence.ts`: the numeric physics and answer checking.

**The lesson page**
- `src/explorer/Explorer.tsx`: the whole lesson page (state, layout, saving settings to localStorage,
  the URL `?p=`). It is big and dense; read around the part you touch.
- `src/explorer/explorer.css`: the page layout, the first-screen sizing rules and the lesson block's
  styles.
- `src/explorer/LessonIntro.tsx`: the lead plus "Read the lesson". It measures the lead into
  `--lesson-room`.
- `src/explorer/BuildPlayer.tsx`: the "Watch it build" transport (play, pause, stages, progress bar).
- `src/explorer/buildRun.ts`: the five-stage run (Cut it up, One piece, What cancels, Add them up,
  Shrink them): its timing and each stage's narration.
- `src/explorer/lessons.tsx`: the lesson list.
- `src/explorer/Brand.tsx`: the logo.
- `src/home/Home.tsx`, `Site.tsx`, `home.css`: the home page and the routing shell.
- `src/state/route.ts`: the routes.

**The figure**
- `src/diagrams/ChargeDiagram.tsx`: the 2D SVG figure at rest and through every stage of the run (very
  large).
- `src/diagrams/charge-diagram.css`: the figure's styles.
- `src/diagrams/labels.ts`: the label placer (it keeps labels off each other and off the arrows).
- `src/diagrams/pairs.ts`: the mirror pairs that "Add them up" sums.
- `src/diagrams/fan.ts`, `subdivision.ts`, `sampling.ts`, `hotspots.ts`, `Geometry.tsx`: pieces,
  sampling and hit targets.
- `src/diagrams/ViewCube.tsx`, `camera.ts`, `camera.css`: the CAD-style view cube and the camera.
- `src/diagrams/FieldCanvas.tsx`, `fieldlines.ts`, `vectorfield.ts`, `field3d.ts`: field lines and
  arrows.
- `src/diagrams/three/FieldStage.tsx`, `runScene.ts`, `bodies.ts`, `orthoCamera.ts`: the 3D scene. The
  ring, disk and sheet open in 3D; every lesson can switch to it.
- `src/diagrams/snapshot.ts`: the picture used for print.

**The panel and the rest**
- `src/components/EquationWorkbench.tsx`, `DerivationBoard.tsx`, `workbench.css`: the "Build the
  integral" panel.
- `src/workbench/derivation.ts`: the algebra the panel writes, one line per stage.
- `src/components/Math.tsx`: KaTeX rendering and the `Prose` component (reads `$…$` as TeX).
- `src/components/Assessment.tsx`: the limiting cases (open, with a draggable plot).
- `src/components/Onboarding.tsx`, `onboarding.css`: the Walkthrough tour. It opens every visit until
  "Don't show this again".
- `src/components/StartHere.tsx`: the start-here hint.
- `src/components/Laws.tsx`, `laws.css`: the laws reference.
- `src/components/Hint.tsx`, `ErrorBoundary.tsx`.
- `src/print.css`: the printed page.
- `src/state/artifact.ts`: the offline handout.
- `src/state/assignment.ts`: link and URL serialisation.
- `src/state/storage.ts`: saved settings.
- `app/globals.css`: theme tokens, dark mode and type scale.

**Tests and config**
- `tests/`: about 170 files.
  - `*.test.ts` run in the `unit` project; `*.browser.test.tsx` in the Chromium `browser` project.
  - Good templates to copy from: `tests/build-ui.browser.test.tsx` (the `openLesson` helper, the
    afterEach, stubbing requestAnimationFrame and reduced motion); `tests/print.browser.test.tsx`
    (screenshots); `tests/content-w4-problem-fit.browser.test.tsx` (the first-screen fit check).
- `vitest.config.ts`: the vitest projects.
- `docs/quiz-plan.md` and `docs/gauss-law-plan.md` are plans only. Do NOT build them.

## 3. House rules (breaking any of these is a bug)
- **No numerals as values on the page.** Symbols only; structural constants inside TeX are fine.
- **No em dashes (—)** in any text a reader sees. `tests/no-em-dash.test.ts` enforces it. Use commas,
  colons, brackets or full stops.
- **One set of symbols everywhere.** The angle at P is α (the infinite line's angular route uses θ;
  the arc's opening angle is φ and its piece angle θ). ΔQ = λΔy while pieces are finite, dy after the
  limit. The figure, the panel, the narration and the lesson text all use the same symbols, names
  and signs.
- **Sign-neutral wording.** A piece *makes a field at* P, away from a positive charge and toward a
  negative one. Every sentence must be true for negative charge too.
- **Symmetric lessons add MIRROR PAIRS** (`src/diagrams/pairs.ts`), so the cancellation is visible and
  the sum grows along the axis. Never a tip-to-tail arc.
- **The sheet's story is inverted.** Cut at equal angles, its far rings contribute MORE. Never say the
  far parts matter less there.
- **Potential lessons** stack each piece's number into a column. A scalar has nothing to cancel.
- **Unbounded lessons** (infinite line, semi, sheet) draw one piece as a wedge of angle at P. A break
  mark would be wrong.
- **Reduced motion** steps through the argument; it never jumps to the final frame.
- **The first screen:** at 1280×720 the "Cut it up" step and "Watch it build" must be visible without
  scrolling, and at 1366×657 (a school Chromebook) the whole drawing must be. Never make a lesson's
  lead longer.
- **The offline handout** never prints the same display twice.

## 4. Known pitfalls (they have bitten before)
- **CI is about 6.5× slower than this Mac,** and it runs Linux, whose fonts set text a little wider: a
  line that fits here can wrap there.
  - Give any browser test over ~1.5 s locally an explicit timeout.
  - Leave a few pixels of margin in layout assertions.
- **Browser tests that open lessons:**
  - unmount between lessons (`cleanup()`);
  - reset the URL (`history.replaceState(null,'','/')`) before rendering;
  - save settings with `hideTour: true, cued: true` so the tour stays shut;
  - if the page opened on the wrong lesson, choose the right one from the "Lessons" nav. A stale
    `?p=` or a pending debounced save opens the wrong lesson.
- **Animation timing can't be judged in a hidden browser:** its clock freezes. Screenshot settled
  frames, or stub requestAnimationFrame and step it.
- **The repo's own browser project does not load the global CSS,** so its screenshots are unstyled.
  Use the styled config (below) for anything you look at.

## 5. Critique (report before you fix)
Look at the real, styled page:
1. **Write a temporary test** `tests/zz-codex-*.browser.test.tsx`.
   - At its top: `import 'katex/dist/katex.min.css'; import '../app/globals.css';`
   - Mount `<Explorer />` from `src/explorer/Explorer.tsx` after writing localStorage (copy
     `openLesson` and the afterEach from `tests/build-ui.browser.test.tsx`).
   - Size with `page.viewport(w, h)`; capture with `page.screenshot({path})` (`import {page,
     userEvent} from 'vitest/browser'`).
   - Drive the run with the buttons "Watch it build", "Stage N: <name>", "Next stage", "Pause" and
     "Play", and with the board's "<stage>: play this step on the figure".
   - Before screenshots, inject `*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}`.
   - For the home page, mount `src/home/Home.tsx` the same way.
2. **Run it with the styled config:**
   `FB_ROOT=$(pwd) npx vitest run -c ~/Developer/field-builder/.claude/loop/vitest.styled.config.mjs tests/zz-codex-*.browser.test.tsx`
   Then open the PNGs and look at them properly.
3. **Go through five lenses.** For each, cover all 15 lessons at rest and at every stage, at 1440×900,
   1280×720, 1366×657 and 390×844, and spot-check dark theme, 3D and print:
   1. **Figure (2D and 3D).** Overlapping or clipped labels, arrows leaving the frame or too small to
      read, misplaced angle marks, inconsistent type, layers out of register. Anything that would look
      amateur printed in Griffiths or Purcell.
   2. **Physics of what is drawn and written.** Check numerically (write a small node script) that
      every arrow, component, mirror pair, sum, result, limiting case, narration line, panel line and
      lesson sentence is right. Do this for both charge signs and at slider extremes (distance
      0.5–6, L 1–8, R 0.5–4, charge −5…5, φ 0.1π–2π, N 3–30).
   3. **Panel and typesetting.** Alignment, overflow and spacing of the derivation board, glosses and
      result. Is each line what a great lecturer would write?
   4. **The confused first-year student.** Use four lessons for real, starting from the home page:
      read the lesson, watch it build, build the integral. Where exactly do you get lost? Which words
      or symbols are never explained?
   5. **Page, accessibility and phones.** Keyboard-only use, screen-reader names and announcements,
      focus order and visibility, contrast in both themes, reduced motion, 390 px width, 1366×768
      Chromebooks, print and the handout.
4. **Write `docs/rounds/codex-round-<YYYY-MM-DD>.md`.**
   - List every finding, worst first.
   - Each finding gets a severity (BROKEN / WRONG / MISLEADING / UGLY / CONFUSING / POLISH), where
     (file:line), evidence (a screenshot path or numbers) and the precise fix.
   - Drop your own weak findings: only real, specific, actionable problems count.

## 6. Fix
- **Order:** worst-first; do as many as you can do WELL. Fix root causes, not symptoms.
- **Verify each fix:**
  - visual fixes by a new screenshot;
  - physics and teaching fixes numerically.
- **Test each fix** where practical. The test must fail without the fix. Name new tests
  `tests/codex-*.test.ts(x)`.
- **One commit per coherent fix:** a short subject, a why-paragraph, and the final line
  `Co-Authored-By: Codex <noreply@openai.com>`.
- **All green before merging:**
  ```
  npx tsc --noEmit
  npx oxlint
  npx vitest run --exclude 'tests/zz-*'
  npm run build:static
  ```
- **Clean up:** delete your `tests/zz-codex-*` files.
- **Finish the report:** add what you fixed, what you rejected and why, and what is left over. Commit
  `docs/rounds/codex-round-<date>.md`.

## 7. Merge to main and push
```
git fetch origin
git rebase origin/main          # resolve conflicts keeping both intents
npx tsc --noEmit && npx oxlint && npx vitest run --exclude 'tests/zz-*'
git push origin HEAD:main       # if rejected because main moved: fetch, rebase, re-test, push again
```
- **Watch CI once:** `gh run list --branch main --limit 1`, then `gh run watch <id> --exit-status`.
- **If CI fails:** read `gh run view <id> --log-failed`, fix it in the worktree (remember Linux fonts
  and the slower runner), then push again.
- **Finally:**
  - Add one line under "Done" in `docs/queue.md`: the date, "Codex round", and the commit range.
    Commit and push it.
  - Remove the worktree:
    `cd ~/Developer/field-builder && git worktree remove ../fb-codex-round && git branch -D codex/round`
  - Don't touch the main checkout's other untracked files.

**End with a summary:** the number of findings by severity, what was fixed (one line each), what was
rejected and left over, the commit range, and the CI result.
