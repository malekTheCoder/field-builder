# Quiz yourself: plan

Status: plan only, waiting for the owner's OK (asked 2026-10-13).

The owner wants the quiz to be its own place, separate from the lessons: the student picks which shapes
to be quizzed on, questions are drawn from a bank for those shapes, and they get personalized
feedback at the end.

## Where it lives
- Its own page, `/quiz`, routed like the home page (`src/state/route.ts`).
- Reached from a "Quiz yourself" card on the home page and a link in the header.
- Lessons do not embed quizzes. At most, a lesson's end may say "Quiz yourself on this shape", which
  opens `/quiz` with that shape already ticked.

## 1. Set up the quiz
- **Shapes:** every lesson as a tick box, grouped as on the home page (straight rods, rings/disks/arcs,
  charge with no end, potentials), with "all in this group" and "everything".
- **Kinds of question** (all on by default):
  - Predict: what cancels, which way the field points, how it falls off far away.
  - Set up: dQ, one piece's field, the projection, the bounds, the variable.
  - Check: limiting cases.
  - Transfer: what changes if P moves, the charge flips sign, or the density varies.
- **Length:** Short, Medium or Long, written as words (the page shows no numerals).
- **Start.** Questions are drawn evenly across the chosen shapes, shuffled, mixed by kind.
  - Missed questions from earlier quizzes come back first.

## 2. Taking it
- One question at a time, multiple choice, with the choices in TeX.
- Before answering, the student marks **Sure** or **Guessing**.
- After answering, they get immediate feedback:
  - why the right answer is right;
  - if they were wrong, what their particular choice gets wrong.
- "Next" moves on. There is a progress bar, but no timer.

## 3. Personalized feedback (the end screen)
- **By shape:** how each chosen shape went, shown as a bar (no numerals).
- **Your weak spots:** every wrong choice in the bank is tied to a named misconception. The end screen
  lists the two or three that came up most. For each one:
  - one paragraph on the idea;
  - a link to the exact place that fixes it, such as "Ring of charge, What cancels", which opens the
    lesson at that stage of Watch it build.
- **Confidence:**
  - Wrong but "Sure" is flagged as the most important thing to look at.
  - Right but "Guessing" is flagged as something to review.
- **Next steps:**
  - "Retry the ones you missed";
  - "Quiz again on your weak spots", which builds a new quiz weighted toward those misconceptions;
  - the lessons to revisit.
- **History** is kept in the browser only (localStorage). It is never sent anywhere.
  - It records which questions were missed and which misconceptions keep coming back, so later quizzes
    adapt.
  - A "clear my history" button wipes it.

Feedback is rule-based, not AI-written: the site has no server, and every message can be checked for
physics. AI feedback on a student's own written attempt could come later, behind a small backend.

## The bank
- `src/quiz/bank/<lesson id>.ts`, about eight to ten questions per shape, so about 130 in all.
- Each question has:
  - `{id, lesson, kind, prompt, choices: [{tex | text, correct?, misconception?}], explanation, review}`;
  - exactly one correct choice;
  - a misconception id on every wrong choice;
  - `review`, which points at a lesson stage or a lesson section.
- `src/quiz/misconceptions.ts` is the catalogue. Its names include:
  - forgot the projection (cos α);
  - Q where λ dy belongs;
  - r where rᵢ belongs;
  - inverse square used for the potential;
  - cancelled a part that survives (endpoint, semi);
  - wrong bounds;
  - dropped the Jacobian;
  - treated a ring as a point;
  - "far pieces matter less" on the sheet.
- The bank's symbols and conventions match each lesson exactly (α at P, mirror pairs, sign-neutral
  wording, no numerals, no em dashes).

## Checks
- **Unit tests:**
  - every question has exactly one correct choice;
  - every wrong choice has a misconception that exists in the catalogue;
  - every review link points at a real stage or section;
  - KaTeX renders strict;
  - no numerals outside TeX;
  - no em dashes.
- **Browser tests:** set up, take, feedback, end screen, retry, history and clear, keyboard-only use,
  and the 390 px phone width.
- **Physics:** two adversarial reviewers check every question and every explanation before it ships.

## Order of work
1. The engine and the three screens, with the bank for three shapes (finite line, ring, infinite
   line), for the owner to try.
2. The rest of the bank, written two agents at a time.
3. The physics review, then ship.
