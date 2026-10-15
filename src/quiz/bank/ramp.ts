import type {Question} from '../types';
const raw = String.raw;

/* THE RAMP, in its lesson's symbols (src/lessons/ramp.ts): a rod standing on the y-axis from y = 0 to y = L,
 * its density λ(y) = λ₀ (y/L), zero at the foot and λ₀ at the top, total charge Q = λ₀L/2, P = (r, 0) level
 * with the empty end, a piece at height y holding ΔQ = λ(y)Δy, rᵢ = √(y² + r²), α the angle at P to the
 * x-axis. The one new idea is the density riding inside the integral, and where the charge sits mattering as
 * well as how much. Every result and limit here is checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'ramp-dq', lesson: 'ramp', kind: 'setup',
    prompt: raw`The density is $\lambda(y)=\lambda_0\,(y/L)$. What charge does the piece at height $y$, of length $dy$, hold?`,
    choices: [
      {correct: true, tex: raw`dQ=\lambda_0\,\frac{y}{L}\,dy`},
      {tex: raw`dQ=\lambda_0\,dy`, misconception: 'density-inside',
        why: raw`$\lambda_0$ is the density at the top only. At height $y$ the density is $\lambda_0\,(y/L)$, so a piece near the foot holds almost nothing.`},
      {tex: raw`dQ=Q\,\frac{y}{L}\,dy`, misconception: 'whole-charge',
        why: raw`$Q$ is the whole rod’s charge, not a density: $Q\,(y/L)\,dy$ is a charge times a length. The density at height $y$ is $\lambda_0\,(y/L)$.`},
      {tex: raw`dQ=\lambda_0\,\frac{y}{L}`, misconception: 'piece-length',
        why: raw`That is the density at height $y$, a charge per unit length, not a charge. A piece holds the density where it sits times its own length.`},
    ],
    explanation: raw`A piece holds the density where it sits times its length: $\lambda(y)\,dy=\lambda_0\,(y/L)\,dy$. Unlike a uniform rod’s, a piece’s charge now depends on where it is, so $y$ will appear twice in the integrand: in the charge, and in the geometry.`,
    review: {lesson: 'ramp', stage: 'cut'}},

  {id: 'ramp-total', lesson: 'ramp', kind: 'setup',
    prompt: raw`What is the rod’s total charge $Q$?`,
    choices: [
      {correct: true, tex: raw`Q=\frac{\lambda_0L}{2}`},
      {tex: raw`Q=\lambda_0L`, misconception: 'density-inside',
        why: raw`That would be a rod with density $\lambda_0$ all along it. This one rises evenly from zero to $\lambda_0$, so on average it holds half of $\lambda_0$ per unit length.`},
      {tex: raw`Q=\frac{\lambda_0L^2}{2}`, misconception: 'density-inside',
        why: raw`That integrates $\lambda_0\,y$ and drops the $1/L$ in the density. $\lambda_0\,y$ is not a density, and the result is not a charge: it has an extra length in it.`},
      {tex: raw`Q=\frac{\lambda_0}{2}`, misconception: 'piece-length',
        why: raw`That is the average density, a charge per unit length. The total charge is the average density times the rod’s length.`},
    ],
    explanation: raw`Add up every piece: $\int_0^L\lambda_0\,(y/L)\,dy=\lambda_0L/2$. The density rises evenly from zero to $\lambda_0$, so its average is $\lambda_0/2$, and the total is that average times $L$.`,
    review: {lesson: 'ramp', section: 'The setup'}},

  {id: 'ramp-ex-integrand', lesson: 'ramp', kind: 'setup',
    prompt: raw`Which integral is $E_x$, the part of the field along $x$?`,
    choices: [
      {correct: true, tex: raw`\int_0^L\frac{k\lambda_0\,(y/L)\,dy}{y^2+r^2}\cdot\frac{r}{\sqrt{y^2+r^2}}`},
      {tex: raw`\int_0^L\frac{k\lambda_0\,dy}{y^2+r^2}\cdot\frac{r}{\sqrt{y^2+r^2}}`, misconception: 'density-inside',
        why: raw`That is a uniform rod of density $\lambda_0$. The density here depends on where the piece is, so $\lambda_0\,(y/L)$ goes inside the integral.`},
      {tex: raw`\int_0^L\frac{k\lambda_0\,(y/L)\,dy}{y^2+r^2}`, misconception: 'projection',
        why: raw`That adds the whole of each piece’s field. Only the fraction $\cos\alpha=r/\sqrt{y^2+r^2}$ of it lies along $x$.`},
      {tex: raw`\int_0^L\frac{k\lambda_0\,(y/L)\,dy}{y^2+r^2}\cdot\frac{y}{\sqrt{y^2+r^2}}`, misconception: 'wrong-part',
        why: raw`$y/\sqrt{y^2+r^2}$ is $\sin\alpha$, which projects onto the rod. The part along $x$ is adjacent to the angle at $P$, so it takes $\cos\alpha$.`},
    ],
    explanation: raw`Each piece holds $\lambda_0\,(y/L)\,dy$, makes a field $k\,dQ/(y^2+r^2)$, and only $\cos\alpha=r/\sqrt{y^2+r^2}$ of that lies along $x$. The density’s $y$ makes this the easy integral: $u=y^2+r^2$ gives $E_x=(k\lambda_0/L)\bigl(1-r/\sqrt{L^2+r^2}\bigr)$.`,
    review: {lesson: 'ramp', stage: 'shrink'}},

  {id: 'ramp-vs-uniform', lesson: 'ramp', kind: 'predict',
    prompt: raw`Compare the ramp with a uniform rod of the same length and the same total charge $Q$, both seen from $P$. Which has the larger $|E_x|$?`,
    choices: [
      {correct: true, text: raw`The uniform rod: the ramp keeps more of its charge near the top, farther from $P$.`},
      {text: raw`Neither: with the same $Q$, they make the same field.`, misconception: 'density-inside',
        why: raw`Only far away does the total charge alone fix the field. Close by, where the charge sits matters, and the ramp’s sits farther from $P$.`},
      {text: raw`The ramp: its densest part, $\lambda_0$, is twice the uniform rod’s density.`, misconception: 'density-inside',
        why: raw`Its densest part is at the top, the end farthest from $P$, and its foot is nearly empty. The uniform rod has more charge near $P$.`},
    ],
    explanation: raw`Both hold $Q$, but the ramp’s charge is gathered toward the top, away from $P$, while the uniform rod keeps a fair share near the foot, close to $P$. Near charge counts for more, so at every distance the uniform rod’s $|E_x|$ is the larger; the two agree only far away.`,
    review: {lesson: 'ramp', section: 'What the answer says'}},

  {id: 'ramp-middle', lesson: 'ramp', kind: 'predict',
    prompt: raw`Slide $P$ up, keeping its distance $r$, until it is level with the rod’s middle. Is $E_y$ zero there?`,
    choices: [
      {correct: true, text: raw`No: a piece above the middle holds more charge than its mirror below, so their parts along the rod do not cancel.`},
      {text: raw`Yes: every piece now has a mirror the same distance from $P$.`, misconception: 'cancel-survivor',
        why: raw`Being the same distance away is not enough. Mirror pieces cancel only if they hold the same charge, and here the upper piece of each pair always holds more.`},
      {text: raw`Yes: the density has one sign all along the rod.`, misconception: 'density-inside',
        why: raw`One sign is why nothing cancels for a potential. For the field, the pairs must match in charge too, and the ramp’s pairs do not.`},
    ],
    explanation: raw`The reflection about the middle maps the rod onto itself but not its charge: the piece a distance above the middle holds more than the one the same distance below. Their parts along the rod are unequal, and the upper one wins: for a positive charge, $E_y$ points down.`,
    review: {lesson: 'ramp', stage: 'cancel'}},

  {id: 'ramp-far-ex', lesson: 'ramp', kind: 'check',
    prompt: raw`Far from the rod, $r\gg L$, which point charge does $E_x$ imitate?`,
    choices: [
      {correct: true, tex: raw`\frac{kQ}{r^2},\quad Q=\frac{\lambda_0L}{2}`},
      {tex: raw`\frac{k\lambda_0L}{r^2}`, misconception: 'density-inside',
        why: raw`$\lambda_0L$ would be the charge of a rod with density $\lambda_0$ all along it, twice this one’s. Far away only the total charge matters, and it is $\lambda_0L/2$.`},
      {tex: raw`\frac{2k\lambda_0}{r}`, misconception: 'far-limit',
        why: raw`That falls as $1/r$, as an endless line’s field does. A finite rod seen from far away looks like a point, and its field falls as the inverse square.`},
    ],
    explanation: raw`When $r\gg L$, $r/\sqrt{L^2+r^2}$ is nearly $1-L^2/(2r^2)$, so $E_x=(k\lambda_0/L)\bigl(1-r/\sqrt{L^2+r^2}\bigr)$ tends to $k\lambda_0L/(2r^2)$, which is $kQ/r^2$ with $Q=\lambda_0L/2$. From far off, only how much charge there is matters.`,
    review: {lesson: 'ramp', section: 'Limiting cases'}},

  {id: 'ramp-far-ey', lesson: 'ramp', kind: 'check',
    prompt: raw`Far away, $E_y$ falls faster, as $-kQ\bar y/r^3$. What is the length $\bar y$?`,
    choices: [
      {correct: true, text: raw`$\bar y=2L/3$: the ramp’s centre of charge, above the middle.`},
      {text: raw`$\bar y=L/2$: the rod’s middle.`, misconception: 'density-inside',
        why: raw`That is the centre of charge of a uniform rod. The ramp’s density rises toward the top, so its charge is centred higher.`},
      {text: raw`$\bar y=L/3$: the charge sits low on the rod.`, misconception: 'density-inside',
        why: raw`That would be a rod densest at its foot. This one is empty at the foot and densest at the top, so its centre of charge is above the middle.`},
    ],
    explanation: raw`Far away each piece’s part along the rod is nearly $-k\,dQ\,y/r^3$, so $E_y$ adds up the charge weighted by its height: $-k\bar yQ/r^3$, with $\bar y$ the charge’s average height. For $\lambda\propto y$ that is $2L/3$. The part along the rod remembers where the charge sits, not just how much there is.`,
    review: {lesson: 'ramp', section: 'Limiting cases'}},

  {id: 'ramp-flipped', lesson: 'ramp', kind: 'transfer',
    prompt: raw`Turn the ramp upside down: densest at the foot, $\lambda_0\,(1-y/L)$, empty at the top, with $P$ still at $(r,0)$. How does $|E_x|$ change?`,
    choices: [
      {correct: true, text: raw`It grows: the same charge now sits nearer $P$.`},
      {text: raw`It stays the same: the total charge is still $\lambda_0L/2$.`, misconception: 'density-inside',
        why: raw`The total is the same, but its place is not. Close by, charge near $P$ counts for more than charge far from it.`},
      {text: raw`It shrinks: the density now falls along the rod instead of rising.`, misconception: 'density-inside',
        why: raw`Which way the density runs matters only through where it puts the charge. Falling from the foot puts the charge near $P$, where each piece makes a bigger field, more nearly along $x$.`},
    ],
    explanation: raw`The flipped rod holds the same $Q$, but gathered at the foot, close to $P$. Near pieces make bigger fields, and the nearer the foot a piece is, the more nearly along $x$ its field points, so $|E_x|$ grows. The density still rides inside the integral, now as $\lambda_0\,(1-y/L)$.`,
    review: {lesson: 'ramp', stage: 'cut'}},

  {id: 'ramp-negative', lesson: 'ramp', kind: 'transfer',
    prompt: raw`Make $\lambda_0$ negative, so every piece is negative. Which way does the field at $P$ point?`,
    choices: [
      {correct: true, text: raw`Toward the rod and up, above the $x$-axis.`},
      {text: raw`Toward the rod and down, below the $x$-axis.`, misconception: 'sign',
        why: raw`A negative charge turns each piece’s whole arrow round, both parts. Each now points from $P$ toward its piece, which is above $P$: up.`},
      {text: raw`Straight toward the rod, along $x$.`, misconception: 'cancel-survivor',
        why: raw`The sign does not create a partner. Every piece is still above $P$, so the parts along the rod still add, now pointing up.`},
    ],
    explanation: raw`Every piece’s field now points from $P$ toward the piece: back toward the rod along $x$, and up. Both $E_x$ and $E_y$ carry the sign of $\lambda_0$, so $E_x<0$ and $E_y>0$.`,
    review: {lesson: 'ramp', section: 'What the answer says'}},
];
