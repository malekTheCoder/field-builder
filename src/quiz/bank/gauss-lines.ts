import type {Question} from '../types';
const raw = String.raw;

/* LINES AND CYLINDERS, in its lesson's symbols (src/gauss/lessons/lines.ts): an infinite line of λ, a solid rod of
 * radius R carrying λ per unit length spread evenly (ρ = λ/πR²), a thin cylindrical shell of radius R carrying λ
 * (σ = λ/2πR), and a coaxial cable, a shell of radius a carrying λ inside one of radius b carrying minus λ. A coaxial
 * cylinder of radius r and any length L gives E_r(2πrL) = Q_enc/ε₀; E_r is negative where the field points in.
 * Every result here is checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'lines-length', lesson: 'lines', kind: 'setup',
    prompt: raw`Round the infinite line you draw a coaxial cylinder of radius $r$ through $P$. How long must it be?`,
    choices: [
      {correct: true, text: raw`Any length $L$ you like: it appears on both sides of the law and cancels.`},
      {text: raw`As long as the line, so that it encloses all of the charge.`, misconception: 'surface-real',
        why: raw`An infinite line has no end to reach, and the surface never needs all the charge. It needs the field perpendicular to its wall and the same all over it, and along it on the ends, which holds for a cylinder of any length.`},
      {text: raw`Short compared with $r$, or its two ends would carry flux.`, misconception: 'parallel-patch',
        why: raw`The ends carry no flux at any length: the field is radial from the line, outward or inward, so it lies along every patch of the flat ends.`},
    ],
    explanation: raw`The wall carries $E_r\,(2\pi rL)$ and the cylinder holds $\lambda L$, so $L$ is on both sides and cancels. Changing this auxiliary length leaves $P$ fixed, so $L$ must disappear; the radius $r$ still locates $P$ and remains in the field.`,
    review: {lesson: 'lines', section: 'A useful surface, a free length'}},

  {id: 'lines-field', lesson: 'lines', kind: 'setup',
    prompt: raw`Setting $E_r\,(2\pi rL)=\lambda L/\varepsilon_0$, what is the field of the infinite line?`,
    choices: [
      {correct: true, tex: raw`E_r=\frac{\lambda}{2\pi\varepsilon_0r}`},
      {tex: raw`E_r=\frac{\lambda}{4\pi\varepsilon_0r^2}`, misconception: 'line-falloff',
        why: raw`That is a point charge’s field, with $\lambda$ in place of $q$. A cylinder’s wall grows as $r$, not as $r^2$, so dividing by it leaves $1/r$.`},
      {tex: raw`E_r=\frac{\lambda L}{2\pi\varepsilon_0r}`, misconception: 'size-left-in',
        why: raw`$L$ is on both sides: in the wall’s area $2\pi rL$ and in the charge $\lambda L$. Divided through, it leaves no trace.`},
    ],
    explanation: raw`Dividing both sides by $2\pi rL$ gives $E_r=\lambda/(2\pi\varepsilon_0r)$, which with $k=1/(4\pi\varepsilon_0)$ is $2k\lambda/r$: the field the Infinite line lesson built from the line’s pieces. It points out for a positive $\lambda$ and in for a negative one.`,
    review: {lesson: 'lines', stage: 'solve', case: 'line'}},

  {id: 'lines-wider', lesson: 'lines', kind: 'check',
    prompt: raw`Check the line’s answer with a second cylinder of the same length and twice the radius. What must the field on its wall be?`,
    choices: [
      {correct: true, text: raw`Half the field on the first: it holds the same charge, and its wall is twice as large.`},
      {text: raw`A quarter of the field on the first, as for a point charge at twice the distance.`, misconception: 'line-falloff',
        why: raw`A sphere’s area grows as $r^2$, but a cylinder’s wall only as $r$. The same flux spread over twice the area gives half the field, not a quarter.`},
      {text: raw`The same field: the line is infinite, so moving away from it changes nothing.`, misconception: 'line-falloff',
        why: raw`That is a sheet’s story, which looks the same from every height. A line does not: twice as far away, its field is spread over a wall twice as large.`},
    ],
    explanation: raw`Both cylinders hold $\lambda L$, so both carry the flux $\lambda L/\varepsilon_0$. The wider one spreads it over a wall of $2\pi(2r)L$, twice the first’s, so the field on it is half as big: $|E_r|$ falls as $1/r$.`,
    review: {lesson: 'lines', section: 'Check the answer', case: 'line'}},

  {id: 'lines-rod-qenc', lesson: 'lines', kind: 'setup',
    prompt: raw`Inside the solid rod, at $r<R$, how much charge does a coaxial cylinder of length $L$ hold?`,
    choices: [
      {correct: true, tex: raw`\lambda L\,\frac{r^2}{R^2}`},
      {tex: raw`\lambda L`, misconception: 'qenc-total',
        why: raw`That is all the charge in a length $L$ of rod. A cylinder inside the rod holds only the core within $r$; the rest of the rod lies outside it.`},
      {tex: raw`\lambda L\,\frac{r^3}{R^3}`, misconception: 'ratio-power',
        why: raw`A ratio of cubes is a ball’s, whose volume grows as $r^3$. Over the same length, a cylinder’s volume grows as its cross section, $\pi r^2$, so the fraction is $r^2/R^2$.`},
    ],
    explanation: raw`With $\rho=\lambda/(\pi R^2)$, thin cylindrical shells of volume $2\pi r'L\,dr'$ added from the axis out to $r$ give $\pi\rho Lr^2=\lambda Lr^2/R^2$. Then $E_r=\lambda r/(2\pi\varepsilon_0R^2)$, growing in step with $r$ from zero on the axis.`,
    review: {lesson: 'lines', stage: 'right', case: 'rod'}},

  {id: 'lines-rod-meet', lesson: 'lines', kind: 'check',
    prompt: raw`For the solid rod, your inside answer gives $\lambda/(\pi\varepsilon_0R)$ at $r=R$, and your outside answer gives $\lambda/(2\pi\varepsilon_0R)$ there. What does that say?`,
    choices: [
      {correct: true, text: raw`There is a slip: the rod’s charge is spread through its volume, with none on its surface, so the two answers must meet at $R$.`},
      {text: raw`Nothing: the field always jumps at the surface of a charged rod.`, misconception: 'boundary-match',
        why: raw`A jump needs a finite charge on a surface of no thickness, as on a thin shell. A solid rod’s charge is spread through its volume, so the charge inside changes smoothly through $R$, and so does the field.`},
      {text: raw`That the field jumps by $\lambda/(2\pi\varepsilon_0R)$ there, since the rod’s charge ends at its surface.`, misconception: 'boundary-match',
        why: raw`A jump of that size needs all of a length’s $\lambda$ sitting on the surface itself, as on a thin shell. The solid rod’s charge ends at $R$ but has no surface charge there, so a cylinder just inside and one just outside $R$ hold the same $\lambda L$.`},
    ],
    explanation: raw`$E_r=Q_{\text{enc}}/(2\pi\varepsilon_0rL)$, and with a volume charge $Q_{\text{enc}}$ is continuous: a cylinder just inside $R$ and one just outside both hold $\lambda L$. So both answers must give $\lambda/(2\pi\varepsilon_0R)$ at $R$; a mismatch is a slip, most often an upper limit.`,
    review: {lesson: 'lines', section: 'Check the answer', case: 'rod'}},

  {id: 'lines-shell-inside', lesson: 'lines', kind: 'predict',
    prompt: raw`What is the field inside the thin cylindrical shell, at a point off its axis?`,
    choices: [
      {correct: true, text: raw`Zero, everywhere in the hollow, not only on the axis.`},
      {text: raw`Zero only on the axis. Off it, the near side of the shell, being closer, wins.`, misconception: 'shell-inside',
        why: raw`A coaxial cylinder through any inner point encloses none of the shell’s charge, and symmetry makes $E_r$ the same all over its wall, so $E_r$ is zero there. The near side is closer, but the far side holds more charge in each wedge of directions, farther off, and the two cancel.`},
      {text: raw`Not settled: zero flux through a cylinder inside says only that it encloses no charge.`, misconception: 'zero-flux-zero-field',
        why: raw`Alone, zero flux would say no more than that. Here symmetry has already said $E_r$ is the same on every patch of the wall, and a sum of equal pieces that comes to zero has every piece zero.`},
    ],
    explanation: raw`A cylinder inside the shell holds no charge, so $E_r\,(2\pi rL)=0$. Since the shell has a line’s symmetries, $E_r$ is the same all over that wall, so $E_r=0$ at every radius inside: the hollow has no field at all.`,
    review: {lesson: 'lines', stage: 'solve', case: 'tube'}},

  {id: 'lines-coax-outside', lesson: 'lines', kind: 'predict',
    prompt: raw`Outside the coaxial cable, at $r>b$, what is the field?`,
    choices: [
      {correct: true, text: raw`None: a cylinder there holds $\lambda L-\lambda L=0$, and by symmetry $E_r$ is the same all over its wall, so it is zero.`},
      {text: raw`$\lambda/(\pi\varepsilon_0r)$: the cylinder holds both shells, so their fields add.`, misconception: 'sign',
        why: raw`The cylinder does hold both, but the outer shell carries $-\lambda$. Charges add with their signs, and these add to zero.`},
      {text: raw`$\lambda/(2\pi\varepsilon_0r)$, the inner shell’s: a shell makes no field outside itself, so the outer one adds nothing.`, misconception: 'outside-point',
        why: raw`A shell makes no field inside itself. Outside it, it makes a line’s field, here $-\lambda/(2\pi\varepsilon_0r)$, which cancels the inner shell’s exactly.`},
    ],
    explanation: raw`Outside both shells the cylinder encloses $\lambda L$ and $-\lambda L$, so its flux is zero, and the line’s symmetries make $E_r$ the same on every patch of its wall: $E_r=0$. The cable’s field lives only between its shells.`,
    review: {lesson: 'lines', stage: 'right', case: 'coax'}},

  {id: 'lines-finite', lesson: 'lines', kind: 'transfer',
    prompt: raw`A charged rod is only a few times longer than your distance from it. Can a coaxial cylinder through $P$, beside its middle, give its field?`,
    choices: [
      {correct: true, text: raw`No. Near a finite rod the field leans and changes along the wall, and the ends catch flux, so $E$ cannot come out of the integral: build the integral instead.`},
      {text: raw`Yes: $E_r=\lambda/(2\pi\varepsilon_0r)$, as for any straight rod.`, misconception: 'false-symmetry',
        why: raw`That needed the charge to run on for ever, so that sliding along the axis changed nothing. A short rod’s field weakens toward its ends, so it is not the same all along the wall.`},
      {text: raw`Yes, if the cylinder is long enough to hold the whole rod.`, misconception: 'surface-real',
        why: raw`Holding all the charge is not what the surface needs. It needs the field the same all over its wall and perpendicular to it, and none through its ends, and round a short rod it has neither.`},
    ],
    explanation: raw`Every step for the line leaned on the charge going on for ever. Treat a rod as infinite only when it is long compared with your distance from it and you are far from its ends; otherwise the flux is still the charge inside over $\varepsilon_0$, but the field comes from adding up the rod’s pieces.`,
    review: {lesson: 'lines', section: 'Only when it is long'}},

  {id: 'lines-sigma-given', lesson: 'lines', kind: 'transfer',
    prompt: raw`The thin cylindrical shell’s charge is given as $\sigma$ per unit area instead of $\lambda$ per unit length. What is $E_r$ outside it?`,
    choices: [
      {correct: true, tex: raw`E_r=\frac{\sigma R}{\varepsilon_0r}`},
      {tex: raw`E_r=\frac{\sigma}{2\pi\varepsilon_0r}`, misconception: 'ring-area',
        why: raw`That puts $\sigma$ where $\lambda$ was, but they are different densities. A length $L$ of shell is a strip of area $2\pi RL$, so it holds $\sigma\,(2\pi RL)$, and $\lambda=2\pi R\sigma$.`},
      {tex: raw`E_r=\frac{\sigma RL}{\varepsilon_0r}`, misconception: 'size-left-in',
        why: raw`The cylinder holds $\sigma\,(2\pi RL)$ and its wall is $2\pi rL$: the $L$ is in both and cancels.`},
    ],
    explanation: raw`A cylinder of length $L$ outside the shell holds $\sigma\,(2\pi RL)$, so $E_r\,(2\pi rL)=\sigma\,(2\pi RL)/\varepsilon_0$ and $E_r=\sigma R/(\varepsilon_0r)$. With $\lambda=2\pi R\sigma$ it is the same field as $\lambda/(2\pi\varepsilon_0r)$, written in what you were given.`,
    review: {lesson: 'lines', section: 'Check the answer', case: 'tube'}},

  {id: 'lines-negative-rod', lesson: 'lines', kind: 'transfer',
    prompt: raw`Give the solid rod a negative $\lambda$. Inside it, which way does the field point, and where is it largest in size?`,
    choices: [
      {correct: true, text: raw`In, toward the axis, growing in size from zero on the axis to its largest at the surface, $r=R$.`},
      {text: raw`Out, since $\lambda r/(2\pi\varepsilon_0R^2)$ is the field’s size, which cannot be negative.`, misconception: 'sign',
        why: raw`$E_r$ is a signed part along $\hat{\mathbf r}$, not a size. It takes the sign of $\lambda$, so for a negative $\lambda$ it is negative and the field points in.`},
      {text: raw`In, and largest in size on the axis, where there is charge all round.`, misconception: 'local-density',
        why: raw`On the axis a cylinder holds no charge at all, so the field there is zero. Its size grows with the charge the cylinder holds, $\lambda Lr^2/R^2$, out to the surface.`},
    ],
    explanation: raw`Nothing in the argument used the sign: $E_r=\lambda r/(2\pi\varepsilon_0R^2)$ inside for either. For a negative $\lambda$ it is negative for $r>0$, so the field points in, from zero on the axis to $|\lambda|/(2\pi\varepsilon_0R)$ in size at the surface, falling as $1/r$ outside.`,
    review: {lesson: 'lines', stage: 'solve', case: 'rod'}},
];
