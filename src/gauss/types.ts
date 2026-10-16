import type {ProblemId} from '../problems/types';
import type {LessonSection, Reading} from '../lessons/types';
import type {ChargeKind, SurfaceKind, V3} from './physics';
/* A GAUSS LESSON, AS DATA. The integral lessons are built from a Problem (src/problems) and a Lesson
 * (src/lessons); a Gauss lesson is one object of this type, one file each under src/gauss/lessons/, so a
 * lesson can be read, reviewed and tested without running the page. docs/gauss-lessons-howto.md walks
 * through adding one, with the first two as worked examples.
 *
 * The run says the same recipe every time, the one the owner's study guide teaches: the symmetry, the
 * surface, the left side (the flux integral collapsing to E times an area), the right side (the charge
 * inside), then solve, then check. Each beat is a board line and a narration line; every symbol is
 * written $…$ in prose and as TeX on the board, and every sentence is true for either sign. */

/** Every Gauss lesson the plan names, in teaching order (docs/gauss-law-plan.md). */
export type GaussId = 'symmetry' | 'flux' | 'inside' | 'qenc' | 'spheres' | 'lines' | 'sheets' | 'conductors' | 'holes' | 'runs-out' | 'hard';

/** One beat of the run. `line` is what the transport shows while it plays (one short sentence, under ninety
 * characters, symbols as $…$); `caption` is the whole of it, read to a screen reader when the run holds. */
export type Beat = {line: string; caption: string};
/** A beat that writes a line on the board: its TeX, and under it what its new symbols mean (`say`, prose). */
export type BoardBeat = Beat & {tex: string; say?: string};
/** A check on the answer, in the endnotes: a limit, continuity at a boundary, the jump across a surface charge,
 * what cancels. `text` is prose with $…$; `tex` an optional display under it. */
export type Check = {title: string; text: string; tex?: string};

/** What the figure draws for a case: the charge and the closed surface round it, and what the slider moves. */
export type FigureSetup = {
  charge: {kind: ChargeKind; size: number; symbol: string; name: string;
    /** A second size, for a charge with two surfaces: a coaxial pair's outer shell, a metal shell's outer radius. */
    outer?: number;
    /** What the charge's surfaces are called (physics.ts `boundaries`, in order out from the centre): "R", or "a"
     * and "b". The profile under the figure marks them with these letters. */
    bounds?: string[];
    /** The hole cut out of the charge, for Holes by superposition: its radius, and its centre (a ball's), its axis's
     * foot (a rod's) or its centre on the sheet. The figure then solves the whole charge and the plug apart, each
     * round its own surface through P, and adds them at P. */
    hole?: {radius: number; at: V3};
    /** What the charge inside is called on the figure in each region, where the kind's own name would give the answer
     * away or name a charge the case never defines: running the law backwards from a given field. */
    insideNames?: string[];
    /** Where a point charge sits when it is not at the centre: off the centre of a cube. */
    at?: V3;
    /** A multiple of the kind's own amount of charge, so a lesson's cases share one density: a ball with a hole
     * of ρ = 1 carries 4πR³/3 of the ball's units. */
    amount?: number;
  };
  surface: {
    kind: SurfaceKind;
    /** The radius for a sphere or a cylinder, the face height for a pillbox: the size the slider moves. */
    size: {min: number; max: number; initial: number};
    /** The other dimension, fixed: a cylinder's half-length, a pillbox's face radius. */
    other: number;
    /** The slider's name, its symbol last ("Radius r", "Height z"), as every slider on the site is named. */
    label: string;
    /** The regions the slider takes the surface through, one more than the charge has boundaries, in order: what
     * each is called (the slider says it aloud), the field there (TeX), and one sentence on why. Without them the
     * field has one formula everywhere the slider reaches. */
    regions?: Region[];
    /** How the surface is cut into patches, where the default is too coarse to show a field that changes over it. */
    cut?: {bands: number; sectors: number; rings?: number};
    /** A pillbox's bottom face, fixed, when it is not at minus the slider's height: below a slab, the slider moving
     * only the top face. */
    low?: number;
  };
  /** The field drawn at the standard arrow length, in the figure's units (k = 1, unit charge): the same for every
   * case of a lesson, so equal fields are drawn equal and a doubled one twice as long. Without it, the field on
   * the opening surface. */
  reference?: number;
};
/** A stretch of the slider where the field has one formula. */
export type Region = {name: string; tex: string; say: string;
  /** The field here comes from adding fields, not from a Gaussian surface: a pillbox reaching it decides nothing. */
  superposition?: boolean};

/** One worked case: a charge, a surface, and the five beats that take one to the field. A lesson has one case,
 * or several the reader picks between (Symmetry first: a sphere, a line, a plane). */
export type GaussCase = {
  key: string;
  /** The picker's word for it. */
  label: string;
  figure: FigureSetup;
  /** The problem, as a lecturer sets it: what is given and what to find. Prose with $…$. */
  setup: string;
  /** What the symmetry forces E to do: which way it points and where its size is the same. */
  symmetry: BoardBeat;
  /** Which closed surface, through P, and why each of its parts is useful. */
  surface: BoardBeat;
  /** The flux integral collapsing to E·(area), each part of the surface accounted for. */
  left: BoardBeat;
  /** The charge inside: the right side, with its density integral when there is one. */
  right: BoardBeat;
  /** The two sides set equal and solved. `answer` is the result alone, for the board's answer box; `note`, prose
   * under it where the box's own words about the sign would not be true (a flux of zero is not of q's sign). */
  solve: BoardBeat & {answer: string; note?: string;
    /** The answer box's name, where the answer is not the field at P: "The answer, the flux out through the cube". */
    label?: string};
  /** Limits, continuity, the jump of σ/ε₀ across a surface charge, what cancels. */
  checks: Check[];
};

/** A misconception the lesson takes on: the wrong idea, and what is true instead. Both prose with $…$. */
export type Trap = {wrong: string; right: string};

/** Which interactive instrument sits under the figure, if any: the symmetry test, the flux through a closed
 * surface, the field's profile across the regions (`profile`), a charge in a conductor's cavity (`cavity`), a
 * charge carried out of a sphere with each band's flux summed (`inside`), a ball's enclosed charge built shell by
 * shell (`qenc`), the field against r for the spheres (`plot`), a hole moved about a charged ball or rod (`hole`), a
 * charge moved about a cube with each face's share of the flux (`cube`). */
export type Instrument = 'symmetry' | 'flux' | 'profile' | 'cavity' | 'inside' | 'qenc' | 'plot' | 'hole' | 'cube';

export type GaussLesson = {
  id: GaussId;
  /** The page's title, and the sidebar's name. */
  title: string;
  short: string;
  /** One sentence under its name on the home page and in the library. */
  about: string;
  /** The lesson text, in the integral lessons' shape (src/lessons/types.ts): always-shown lead, folded
   * sections, a read list. */
  lead: string;
  sections: LessonSection[];
  read: Reading[];
  cases: GaussCase[];
  traps: Trap[];
  instrument?: Instrument;
  /** Where it leads: the next Gauss lesson when that one is ready, else the related integral lesson. */
  next?: GaussId;
  related?: {field: ProblemId; text: string};
  /** Where the last lesson leads, with no next lesson: back to the home page and every lesson. */
  onward?: 'home';
  /** An integral lesson that builds the same field the long way, offered beside the Next card to compare. */
  alongside?: {field: ProblemId; text: string};
};
