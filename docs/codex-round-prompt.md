# One critique → fix round (prompt for Codex)

Paste everything below the line into Codex, running on this Mac in `~/Developer/field-builder`.
Don't start it while a Claude round is running on the same files. Check `git worktree list` and the
queue's "In progress" section first.

---

You are doing ONE critique-then-fix round on **field-builder**, an interactive electric-field teaching
site for first-year university E&M. Repo: `~/Developer/field-builder` (GitHub
malekTheCoder/field-builder; live at https://field.malekswilam.dev via GitHub Pages; every push to
`main` runs CI: tsc, oxlint, `npm test`, `build:static`, then deploys). The owner's bar is
**textbook quality**: no physics mistakes, no overlapping or clipped text, nothing that looks
amateur, genuinely helps a confused student, something a lecturer would assign.

## 0. Set up a worktree (do all your work there)
```
cd ~/Developer/field-builder
git fetch origin
git worktree add ../fb-codex-round -b codex/round origin/main
cd ../fb-codex-round
ln -s ~/Developer/field-builder/node_modules node_modules
```
Never edit the main checkout `~/Developer/field-builder` except in step 5. Never `git add -A` or
`git add .`; stage explicit paths. Never commit files named `tests/zz-*`.

## 1. Learn the app (read, don't skim)
- Stack: React 19 + TypeScript via vinext, vitest (a `unit` project and a Chromium `browser`
  project via Playwright), oxlint, KaTeX, motion, Three.js.
- Lessons (15): the ids are bisector, axial, endpoint, ramp, infinite, semi, ring, disk, arc, sheet,
  v-ring, v-disk, v-arc, v-rod-bisector and v-rod-axial.
  - Definitions are in `src/problems/*.ts` and `src/distributions/*.ts`, listed in
    `src/problems/definitions.ts`.
- Home page: `src/home/`, routed in `src/state/route.ts`.
- Lesson page: `src/explorer/Explorer.tsx` and `explorer.css`.
  - At the top is a textbook-style lesson: `src/lessons/<id>.ts` and `src/explorer/LessonIntro.tsx`.
  - Then the figure and the "Build the integral" panel.
- "Watch it build" is a five-stage run: Cut it up, One piece, What cancels, Add them up, Shrink them.
  - Script: `src/explorer/buildRun.ts`. Transport: `src/explorer/BuildPlayer.tsx`.
  - Figure: `src/diagrams/ChargeDiagram.tsx`, `charge-diagram.css` and the `labels.ts` placer; 3D in
    `src/diagrams/three/`.
  - Panel: `src/components/EquationWorkbench.tsx` and `DerivationBoard.tsx`, with the algebra in
    `src/workbench/derivation.ts`.
- Also on the page:
  - Limiting cases: `src/components/Assessment.tsx`.
  - The Walkthrough tour: `src/components/Onboarding.tsx`.
  - Print and the offline handout: `src/print.css` and `src/state/artifact.ts`.
- The work queue is `docs/queue.md`; skip anything listed there as In progress.
- Comments in this codebase are long prose about WHY. Match that style and the dense one-line JSX.

## 2. House rules (breaking any of these is a bug)
- **No numerals as values on the page.** Symbols only; structural constants inside TeX are fine.
- **No em dashes (—)** in any text a reader sees. `tests/no-em-dash.test.ts` enforces it. Use
  commas, colons, brackets or full stops.
- **Angles and symbols:**
  - The angle at P is **α** (the infinite line's angular route uses θ).
  - ΔQ = λΔy while pieces are finite, dy after the limit.
  - The figure, the panel, the narration and the lesson text use the same symbols.
- **Sign-neutral wording:** a piece *makes a field at* P, away from a positive charge and toward a
  negative one.
- **Symmetric lessons add MIRROR PAIRS** (`src/diagrams/pairs.ts`), so the cancellation is visible.
  Never a tip-to-tail arc.
- **The sheet's story is inverted.** Cut at equal angles, its far rings contribute MORE. Never say
  the far parts matter less there.
- **Potential lessons** stack each piece's number into a column. A scalar has nothing to cancel.
- **Unbounded lessons** (infinite line, semi, sheet) draw one piece as a wedge of angle at P. A break
  mark would be wrong.
- **Reduced motion** steps through the argument; it never jumps to the end.
- **CI is about 6.5× slower than this Mac.** Give any browser test that takes over 1.5 s locally an
  explicit timeout.
- **Browser tests:** reset the URL in `afterEach` and switch lessons by clicking. A stale `?p=` opens
  the wrong lesson. Saved settings use `hideTour: true` to keep the tour shut.

## 3. Critique (report before fixing)
Look at the real, styled page. Do not start a dev server; port 3000 is the owner's. Instead:
1. **Write a temporary test** named `tests/zz-codex-*.browser.test.tsx`.
   - At its top, `import 'katex/dist/katex.min.css'` and `import '../app/globals.css'`.
   - Mount `<Explorer />` after writing localStorage. Copy the `openLesson` helper and the afterEach
     from `tests/build-ui.browser.test.tsx`.
   - Size the window with `page.viewport(w, h)`.
   - Capture with `page.screenshot({path})`, imported from `vitest/browser`.
   - Drive the run with the buttons "Watch it build", "Stage N: <name>", "Next stage" and "Pause".
   - To see mid-stage frames, stub requestAnimationFrame as `tests/build-ui.browser.test.tsx` does.
   - Before screenshots, inject `*{transition:none!important;animation-duration:0s!important}`.
2. **Run it with the styled config:**
   `FB_ROOT=$(pwd) npx vitest run -c ~/Developer/field-builder/.claude/loop/vitest.styled.config.mjs tests/zz-codex-*.browser.test.tsx`
   (the repo's own browser project renders unstyled). Open the PNGs and look at them.
3. **Go through these five lenses in turn.** For each, cover all 15 lessons at rest and at every
   stage, at 1440×900, 1280×720 and 390×844, and spot-check dark theme:
   1. **Figure (2D).** Overlapping or clipped labels, arrows leaving the frame or too small, misplaced
      angle marks, inconsistent type. Anything that would look amateur printed in Griffiths.
   2. **Physics of what is drawn and written.** Check numerically (write a small node script) that
      every arrow, component, mirror pair, sum, result, limiting case, narration line and lesson
      sentence is right, for both charge signs and at slider extremes.
   3. **Panel and typesetting.** Alignment, overflow and spacing of the derivation board. Is each
      line what a great lecturer would write?
   4. **The confused first-year student.** Where exactly do you get lost? Which words or symbols are
      never explained?
   5. **Page, accessibility and phones.** Keyboard-only use, screen-reader names, focus, contrast,
      390 px width, Chromebook size 1366×768, print.
4. **Write `docs/rounds/codex-round-<YYYY-MM-DD>.md`.** List every finding, worst first. Each one
   gets a severity (BROKEN / WRONG / MISLEADING / UGLY / CONFUSING / POLISH), where (file:line),
   evidence (screenshot or numbers) and the precise fix. Reject your own weak findings; only real,
   specific problems count.

## 4. Fix
- Work worst-first; do as many as you can do WELL. Fix root causes, not symptoms.
- **Visual fixes:** confirm each by a new screenshot.
- **Physics and teaching fixes:** confirm each numerically.
- **Tests:** add a test for each fix where practical (it must fail without the fix).
- **Commits:** one commit per coherent fix, with a short subject and a why-paragraph, ending with the
  line `Co-Authored-By: Codex <noreply@openai.com>`.
- Before merging, all of these must be green:
  ```
  npx tsc --noEmit
  npx oxlint
  npx vitest run --exclude 'tests/zz-*'
  npm run build:static
  ```
- Delete your `tests/zz-codex-*` files when done.
- **The report:** add to it what you fixed, what you rejected and why, and what is left over. Commit
  `docs/rounds/codex-round-<date>.md`.

## 5. Merge to main and push
```
git fetch origin
git rebase origin/main          # resolve conflicts keeping both intents
npx tsc --noEmit && npx oxlint && npx vitest run --exclude 'tests/zz-*'
git push origin HEAD:main       # if rejected because main moved: fetch, rebase, re-test, push again
```
Never force-push. Then watch CI once:
`gh run list --branch main --limit 1`, then `gh run watch <id>`.
If CI fails, read `gh run view <id> --log-failed`, fix in the worktree, then push again.

Finally:
- Add one line under "Done" in `docs/queue.md`: the date, "Codex round", and the commit range. Commit
  and push it.
- Remove the worktree: `cd ~/Developer/field-builder && git worktree remove ../fb-codex-round && git branch -D codex/round`.

**End with a summary:** the number of findings, what was fixed (one line each), what was left over,
the commit range, and the CI result.
