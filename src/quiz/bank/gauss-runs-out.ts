import type {Question} from '../types';
const raw = String.raw;

/* WHEN SYMMETRY RUNS OUT, in its lesson's symbols (src/gauss/lessons/runs-out.ts): a rod of length 2ℓ carrying λ in a
 * closed coaxial cylinder of radius r that holds all of it, and a point charge q inside a cube, off its centre. Gauss's
 * law holds for both, as every question here says: the flux round the rod is 2λℓ/ε₀ and out of the cube q/ε₀. What runs
 * out is a surface on which E is the same all over, so the law gives the flux and not the field. The rod's field beside
 * its middle is the integral lesson's, 2kλℓ/(r√(r²+ℓ²)). Every result here is checked by number in
 * tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'runs-out-flux', lesson: 'runs-out', kind: 'setup',
    prompt: raw`A closed cylinder of radius $r$, longer than the finite rod, holds the whole rod, of length $2\ell$. What is the flux out through it?`,
    choices: [
      {correct: true, tex: raw`\frac{2\lambda\ell}{\varepsilon_0}`},
      {text: raw`$\lambda L/\varepsilon_0$, with $L$ the cylinder’s length, from a line’s field times the wall’s area`, misconception: 'false-symmetry',
        why: raw`A line’s field on the wall would need the charge to run on through the cylinder’s ends. The flux counts the charge inside, which is the rod’s, $2\lambda\ell$, however long the cylinder.`},
      {text: raw`It cannot be found: Gauss’s law holds only for charges with symmetry.`, misconception: 'law-fails',
        why: raw`The law holds for every closed surface round every charge. The flux is the charge inside over $\varepsilon_0$, here $2\lambda\ell/\varepsilon_0$; only the field at $P$ is out of its reach.`},
    ],
    explanation: raw`The cylinder holds the whole rod, $Q_{\text{enc}}=2\lambda\ell$, so its flux is $2\lambda\ell/\varepsilon_0$, for any radius and any length, so long as the rod is inside it. Gauss’s law gives that exactly; the patches’ shares of it are another matter.`,
    review: {lesson: 'runs-out', stage: 'solve', case: 'rod'}},

  {id: 'runs-out-why-not', lesson: 'runs-out', kind: 'predict',
    prompt: raw`The law gives the flux round the finite rod. Why does it not give the field at $P$, beside the rod’s middle?`,
    choices: [
      {correct: true, text: raw`On the wall the field’s outward part changes from patch to patch, and the ends carry flux too, so $E$ cannot come out of the integral.`},
      {text: raw`It does: dividing $2\lambda\ell/\varepsilon_0$ by the wall’s area gives the field at $P$.`, misconception: 'false-symmetry',
        why: raw`Dividing would give the field’s average over the wall, and only if the ends carried nothing. The field is not the same over the wall: strongest beside the middle, weaker and leaning toward the ends, and the ends carry some of the flux.`},
      {text: raw`Because Gauss’s law is only true for charges that go on for ever.`, misconception: 'law-fails',
        why: raw`It is true for every closed surface and every charge: here the flux is exactly $2\lambda\ell/\varepsilon_0$. It is one equation, and the field is a whole function, so it cannot be solved for $E$ at a point.`},
    ],
    explanation: raw`To solve for $E$ the field must be the same over each part of the surface that carries flux, and perpendicular to it. Round a finite rod it weakens and leans toward the ends, and crosses the ends, so the law is one true equation with $E$ still inside an integral.`,
    review: {lesson: 'runs-out', stage: 'left', case: 'rod'}},

  {id: 'runs-out-wider', lesson: 'runs-out', kind: 'predict',
    prompt: raw`Widen the closed cylinder round the finite rod, keeping its length and still holding the whole rod. What happens to the flux?`,
    choices: [
      {correct: true, text: raw`More of it leaves through the ends and less through the wall; the total stays $2\lambda\ell/\varepsilon_0$.`},
      {text: raw`The total grows, since a wider cylinder catches more of the field.`, misconception: 'bigger-surface',
        why: raw`A wider cylinder has a larger wall, but the field on it is weaker. The total flux counts only the charge inside, which has not changed.`},
      {text: raw`It all still leaves through the wall: the ends of a cylinder on the axis never carry flux.`, misconception: 'parallel-patch',
        why: raw`They carry none round an infinite line, whose field is radial, outward or inward. A finite rod’s field gains a part along the axis toward its ends, so it crosses the flat ends.`},
    ],
    explanation: raw`The sum is fixed by the charge inside. How it divides is not: as the cylinder widens, its ends fill more of the directions out from the rod and the wall fewer, so the ends’ share grows while the total stays $2\lambda\ell/\varepsilon_0$.`,
    review: {lesson: 'runs-out', section: 'Check the answer', case: 'rod'}},

  {id: 'runs-out-limits', lesson: 'runs-out', kind: 'check',
    prompt: raw`The field beside the finite rod’s middle, built from its pieces, is $2k\lambda\ell/\big(r\sqrt{r^2+\ell^2}\big)$. What does it become close in, $r\ll\ell$, and far off, $r\gg\ell$?`,
    choices: [
      {correct: true, text: raw`Close in, $2k\lambda/r$, the infinite line’s; far off, $k(2\lambda\ell)/r^2$, a point charge’s.`},
      {text: raw`Close in, $k(2\lambda\ell)/r^2$, a point charge’s; far off, $2k\lambda/r$, the line’s.`, misconception: 'point-up-close',
        why: raw`That is the wrong way round. Close in, the rod’s ends are far away compared with $r$ and it looks endless; far off, its length is small compared with $r$ and it looks like a point.`},
      {text: raw`$2k\lambda/r$ at every distance, since the rod is straight and uniform.`, misconception: 'false-symmetry',
        why: raw`A line’s field needs the charge to go on for ever. Once $r$ is comparable with $\ell$ the ends matter, and far off the field falls as $1/r^2$.`},
    ],
    explanation: raw`For $r\ll\ell$, $\sqrt{r^2+\ell^2}\approx\ell$ and the field is $2k\lambda/r$; for $r\gg\ell$, $\sqrt{r^2+\ell^2}\approx r$ and it is $2k\lambda\ell/r^2$. Gauss’s law gives each limit, treating the rod as an infinite line close in and as a point far off; only the integral joins them.`,
    review: {lesson: 'runs-out', section: 'Check the answer', case: 'rod'}},

  {id: 'runs-out-cube-total', lesson: 'runs-out', kind: 'setup',
    prompt: raw`A point charge $q$ sits inside a cube, off its centre and near one face. What is the flux out of the whole cube?`,
    choices: [
      {correct: true, tex: raw`\frac{q}{\varepsilon_0}`},
      {text: raw`More than $q/\varepsilon_0$, since $q$ is close to one face`, misconception: 'bigger-surface',
        why: raw`The near face does carry more, but the others carry less. Seen from $q$ the cube fills every direction once, wherever inside it $q$ sits.`},
      {text: raw`It cannot be found while $q$ is off the centre, since the faces see it differently.`, misconception: 'law-fails',
        why: raw`The faces’ shares do need their own integrals, but their sum does not: the law gives it, $q/\varepsilon_0$, wherever $q$ is inside.`},
    ],
    explanation: raw`The cube is a closed surface with $q$ inside it, so its flux is $q/\varepsilon_0$, of the sign of $q$, wherever inside it $q$ sits. What depends on where $q$ is, is how that flux divides among the six faces.`,
    review: {lesson: 'runs-out', stage: 'solve', case: 'cube'}},

  {id: 'runs-out-near-face', lesson: 'runs-out', kind: 'predict',
    prompt: raw`With $q$ off the centre and near one face, what flux goes through that near face?`,
    choices: [
      {correct: true, text: raw`A larger share of $q/\varepsilon_0$ than a sixth; how much larger takes an integral over that face.`},
      {text: raw`A sixth, $q/(6\varepsilon_0)$, as for every face.`, misconception: 'false-symmetry',
        why: raw`Equal shares need a turn or a mirror that carries each face onto the next with $q$ left in place, and only a charge at the centre has one. Off the centre the faces differ.`},
      {text: raw`Less than a sixth: close up, the field crosses most of the face at a slant.`, misconception: 'bigger-surface',
        why: raw`A face carries flux in proportion to the cone of directions it fills, seen from $q$. Nearer, the face fills a wider cone, so it carries more, slant and all.`},
    ],
    explanation: raw`Seen from $q$, a nearer face fills more of the directions out of it, so it takes more than a sixth of the flux and the far face less. Each share is an integral of a field that changes across its face; Gauss’s law fixes only their sum.`,
    review: {lesson: 'runs-out', section: 'A charge in a cube'}},

  {id: 'runs-out-sixth', lesson: 'runs-out', kind: 'check',
    prompt: raw`With $q$ at the cube’s centre, each face carries $q/(6\varepsilon_0)$. Where does that come from?`,
    choices: [
      {correct: true, text: raw`Symmetry: turns that leave $q$ in place carry each face onto the others, so the six shares are equal, and the law makes them add to $q/\varepsilon_0$.`},
      {text: raw`From the field times the face’s area: the field on each face is $q/(6\varepsilon_0)$ over that area.`, misconception: 'false-symmetry',
        why: raw`The field across a face is not the same: strongest at its middle, nearest $q$, and slanted toward its edges. Only the total over the face is known, and only because of the symmetry.`},
      {text: raw`Each face is a sixth of the cube’s area, and flux is shared out by area.`, misconception: 'bigger-surface',
        why: raw`Flux is shared by the cone of directions each part fills, seen from $q$, not by area. At the centre the two happen to agree; move $q$ and they do not.`},
    ],
    explanation: raw`At the centre, the six faces look the same from $q$, so they take equal shares of $q/\varepsilon_0$, by symmetry alone. That is the law’s other gift without a field to solve for: equal shares wherever a move that leaves the charge in place carries one part of the surface onto another.`,
    review: {lesson: 'runs-out', section: 'What the law still gives'}},

  {id: 'runs-out-outside', lesson: 'runs-out', kind: 'transfer',
    prompt: raw`Carry the point charge out of the cube altogether. What is the flux out of the cube now, and through each face?`,
    choices: [
      {correct: true, text: raw`Zero in all, though faces still carry flux, in through some and out through others.`},
      {text: raw`Zero through every face, since the charge is no longer inside.`, misconception: 'zero-flux-zero-field',
        why: raw`The charge’s field still crosses the cube: in through the faces turned toward it, out through the others. Only the total cancels.`},
      {text: raw`Still $q/\varepsilon_0$, since the charge’s field still crosses the cube.`, misconception: 'outside-counts',
        why: raw`It crosses in and out in equal amounts, so the net flux is zero. A charge outside a closed surface adds nothing to it.`},
    ],
    explanation: raw`With $q$ outside, the cube encloses nothing, so its net flux is zero. Its field still crosses every face it reaches; the flux in through the near faces and out through the far ones are equal and opposite.`,
    review: {lesson: 'runs-out', section: 'Check the answer', case: 'cube'}},

  {id: 'runs-out-what-gives', lesson: 'runs-out', kind: 'transfer',
    prompt: raw`For a charge with no symmetry that makes $E$ the same over any surface, what can Gauss’s law still give you?`,
    choices: [
      {correct: true, text: raw`The flux through any closed surface from the charge inside it, or the charge inside from a flux, and often the limits a hard integral must reach.`},
      {text: raw`Nothing: without symmetry the law is no use.`, misconception: 'law-fails',
        why: raw`It is still true for every closed surface. It gives total fluxes and charges inside, equal shares where symmetry carries one part onto another, and the limits that check an integral.`},
      {text: raw`The field at any point, by dividing the flux by the surface’s area.`, misconception: 'false-symmetry',
        why: raw`That gives the field’s average outward part over the surface, not its value at a point. Only where the field is the same over the surface is the average the field.`},
    ],
    explanation: raw`The law holds whatever the charge. Without symmetry it is one equation about a whole field, so it does not give $E$ point by point, but it gives fluxes, charges inside and limits; for the field itself, build the integral.`,
    review: {lesson: 'runs-out', section: 'The law holds; the solve needs symmetry'}},

  {id: 'runs-out-short-cylinder', lesson: 'runs-out', kind: 'transfer',
    prompt: raw`Round the middle of a long finite rod, draw a short cylinder, its radius and its length both much less than $\ell$. What does it give for the field there?`,
    choices: [
      {correct: true, text: raw`Nearly $\lambda/(2\pi\varepsilon_0r)$: so close to the middle the rod looks endless, its field is nearly even along the wall, and its ends carry almost nothing.`},
      {text: raw`Exactly $\lambda/(2\pi\varepsilon_0r)$: any cylinder on a rod’s axis gives a line’s field.`, misconception: 'false-symmetry',
        why: raw`Only for an infinite line is the field exactly the same along the wall with none through the ends. For a finite rod that is nearly true close to its middle, never exactly.`},
      {text: raw`Nothing near a line’s field: the cylinder must hold the whole rod to be of any use.`, misconception: 'surface-real',
        why: raw`A Gaussian surface need not hold all the charge. This short one holds $\lambda$ times its own length, and close to the middle the field on its wall is nearly a line’s.`},
    ],
    explanation: raw`Close round the middle, the rod’s ends are far away compared with $r$, so its field is nearly radial and nearly the same along a short wall, and the ends carry a tiny share. The cylinder then gives nearly $\lambda/(2\pi\varepsilon_0r)$, the close-in limit of the integral’s answer.`,
    review: {lesson: 'runs-out', section: 'Easy to confuse with'}},
];
