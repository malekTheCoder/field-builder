# Design language redo: plan

Status: approved 2026-10-14 (Hanken Grotesk, teal accent, ink logo tile). Starts after the Codex round lands.

The owner asked for the site's design language to be redone after the hiketalkstay rebuild they did
(`~/Developer/hiketalkstay-rebuild`, palette "Mererani"). This plan carries that language over, and adapts
it where a physics teaching site differs from a travel site.

## What the hiketalkstay language is
- **Type:** one grotesque family (Hanken Grotesk). Hierarchy comes from size and weight alone: no serif
  headings, no uppercase kickers, no small caps. It uses a fixed scale with tracking that tightens as size
  grows:

  | Step | Size |
  |---|---|
  | fine | 14 |
  | body | 16 |
  | lead | 19 |
  | sub | 24 |
  | head | 30 |
  | page | 42 |
  | hero | 62 |

  - Weights: 400 for reading text, 600 for headings and labels.
  - Wrapping: `text-wrap: balance` on headings and `pretty` on paragraphs.
- **Colour:**
  - Pure-grey neutrals:

    | Role | Value |
    |---|---|
    | ground | #f2f2f2 |
    | surface | #fff |
    | line | #d4d4d4 |
    | muted | #5e5e5e |
    | ink | #171717 |

  - One rare accent, used in hairlines, links and focus only. It never fills anything.
  - The main button is near-black ink, never an accent colour.
  - Dark theme is derived from the light one, not inverted.
- **Surfaces:** no shadows. Depth comes from a white surface on the grey ground and 1px hairlines.
  - Radius: about 14px on buttons, 16px on cards, with squircle corners where supported.
  - A slightly stronger hairline separates sections.
- **Motion:** three speeds.

  | Token | Duration |
  |---|---|
  | press | 80ms |
  | state | 160ms |
  | reveal | 280ms |

  - A 1px press on buttons, and hover changes colour only.
  - No `transition: all`, no scroll-reveal.
- **Principle:** "colour only labels things". It is quiet, editorial and premium, not a dashboard.

## How it maps onto field-builder

**Changes**
- **Chrome to greys.**
  - Today: a blue-grey tinted ground, teal-filled buttons and pills, lifted "paper" cards with shadows.
  - After: pure greys, an ink "Watch it build" and Start button, flat white cards on #f2f2f2 with
    hairlines.
- **Headings to one family.**
  - Today: Source Serif headings with a Geist body.
  - After: one grotesque for everything outside the maths.
  - **The maths stays KaTeX's serif.** A textbook sets maths in a serif, and it should stand apart from
    the prose.
- **Kickers.** The uppercase kickers ("QUIZ YOURSELF", eyebrows, "WHAT YOUR ANSWER GETS WRONG") become
  sentence-case labels at 14/600.
- **Type scale.** One scale, one size per role, applied site-wide: lesson, home, guide and quiz.
- **Motion.** Motion tokens for the chrome. The run's own animation is untouched.

**Kept**
- **The figure's colours** for charge (orange), each piece's contribution and the field (teal). That is
  exactly "colour only labels things": in this site, colour labels physics quantities. They stay
  saturated, and the chrome around them goes quiet, so the figure is the most colourful thing on the
  page.
- **Every first-screen and layout guarantee** (1280×720, 1366×657, 390).
- **Readable maths sizes.**

## The owner's decisions (2026-10-14)
1. **Typeface:** Hanken Grotesk, the same family as hiketalkstay.
2. **Accent:** the site's teal, as the only accent, in hairlines, links and focus, never a fill.
3. **Logo:** an ink tile with a white ∫.

## Order of work (after the Codex round lands, since it touches the same files)
1. **Tokens.** Colour, type scale, radius, motion and dark theme in `app/globals.css`, with a contrast
   check in a test.
2. **Chrome.**
   - Header, sidebar, buttons, cards and pills.
   - The panel's surfaces.
   - Home, guide and quiz.
   - The walkthrough.
   - Print.
3. **A visual pass** at 1440, 1280, 1366×657 and 390, light and dark, before and after screenshots, and
   the whole suite (layout tests will move).
4. **One critic** (visual QA on Sonnet) to look for anything that still reads as the old look.
