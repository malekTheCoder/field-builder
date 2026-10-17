import type {Question} from '../types';
const raw = String.raw;

/* Q_ENC FROM A DENSITY, in its lesson's symbols (src/gauss/lessons/qenc.ts): a uniform ball of radius R and charge
 * Q; a ball with ρ = ρ₀(1 − r/R) and total charge Q, so ρ₀ = 3Q/(πR³); a slab of thickness 2a with
 * ρ = ρ₀(1 − |z|/a) and ρ₀ given; thin shells 4πr′² dr′, with r the Gaussian sphere's radius and r′ the shells'.
 * Every result here is checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'qenc-ratio', lesson: 'qenc', kind: 'setup',
    prompt: raw`A uniform ball of radius $R$ holds a charge $Q$. How much charge is inside a concentric sphere of radius $r<R$?`,
    choices: [
      {correct: true, tex: raw`Q\,\frac{r^3}{R^3}`},
      {tex: raw`Q`, misconception: 'qenc-total',
        why: raw`That is the whole ball’s charge, enclosed only once the sphere is outside it. Inside, the sphere holds only the part of the ball within it.`},
      {tex: raw`Q\,\frac{r^2}{R^2}`, misconception: 'ratio-power',
        why: raw`That is the ratio of the spheres’ areas. The charge fills the ball’s volume, so the fraction inside is a ratio of volumes, $\frac43\pi r^3$ over $\frac43\pi R^3$.`},
      {tex: raw`Q\,\frac{r}{R}`, misconception: 'ratio-power',
        why: raw`The fraction of the radius is not the fraction of the volume: a sphere of half the radius holds an eighth of the ball, not half of it.`},
    ],
    explanation: raw`The density is the same everywhere in the ball, so the charge inside is $Q$ times the fraction of the ball’s volume inside the sphere: $\frac43\pi r^3/\frac43\pi R^3=r^3/R^3$. Thin shells give the same, since $\int_0^r\rho\,4\pi r'^2\,dr'=\rho\,\frac43\pi r^3$.`,
    review: {lesson: 'qenc', stage: 'right', case: 'ratio'}},

  {id: 'qenc-shell-volume', lesson: 'qenc', kind: 'setup',
    prompt: raw`The density changes with $r$, so you add thin shells. What is the volume of the shell of radius $r'$ and thickness $dr'$?`,
    choices: [
      {correct: true, tex: raw`dV=4\pi r'^2\,dr'`},
      {tex: raw`dV=\frac43\pi r'^3`, misconception: 'volume-as-dv',
        why: raw`That is the volume of the whole ball inside $r'$, not of a thin shell of it. A $dV$ has to contain $dr'$.`},
      {tex: raw`dV=4\pi r'^2`, misconception: 'volume-as-dv',
        why: raw`That is the shell’s area. Its volume is the area times its thickness, $dr'$.`},
      {tex: raw`dV=dr'`, misconception: 'rho-dr',
        why: raw`$dr'$ is only the shell’s thickness, a length. Each shell wraps all the way round, with an area $4\pi r'^2$ that grows as $r'$ does.`},
    ],
    explanation: raw`A thin shell is a sphere’s surface, $4\pi r'^2$, given a thickness $dr'$, so $dV=4\pi r'^2\,dr'$. It is the derivative of the volume it builds: $\frac{d}{dr}\big(\frac43\pi r^3\big)=4\pi r^2$.`,
    review: {lesson: 'qenc', section: 'When the density varies: thin shells'}},

  {id: 'qenc-integral', lesson: 'qenc', kind: 'setup',
    prompt: raw`The ball’s density is $\rho_0(1-r/R)$. Which integral is the charge inside a sphere of radius $r<R$?`,
    choices: [
      {correct: true, tex: raw`\int_0^{r}\rho_0\Big(1-\frac{r'}{R}\Big)4\pi r'^2\,dr'`},
      {tex: raw`\int_0^{R}\rho_0\Big(1-\frac{r'}{R}\Big)4\pi r'^2\,dr'`, misconception: 'qenc-limit',
        why: raw`Out to $R$ adds the shells of the whole ball, which gives $Q$. For a point inside, only the shells inside the Gaussian sphere count, so the limit is $r$.`},
      {tex: raw`\int_0^{r}\rho_0\Big(1-\frac{r'}{R}\Big)dr'`, misconception: 'rho-dr',
        why: raw`That adds densities along one radius, and comes out as a charge per area. Each shell’s charge is its density times its volume, $4\pi r'^2\,dr'$.`},
      {tex: raw`\int_0^{r}\rho_0\Big(1-\frac{r}{R}\Big)4\pi r'^2\,dr'`, misconception: 'qenc-limit',
        why: raw`That freezes the density at its value at the Gaussian surface, $\rho(r)$, while $r'$ runs over the shells. The limit $r$ stays fixed, but each shell needs its own density $\rho(r')$: the outer shells are less dense in size than the inner ones.`},
    ],
    explanation: raw`A shell at $r'$ holds $\rho(r')\,4\pi r'^2\,dr'$. The charge inside the Gaussian sphere adds the shells from the centre out to its radius $r$, which stays fixed while $r'$ runs: $Q_{\text{enc}}=\int_0^r\rho_0(1-r'/R)\,4\pi r'^2\,dr'$.`,
    review: {lesson: 'qenc', stage: 'right', case: 'shells'}},

  {id: 'qenc-normalise', lesson: 'qenc', kind: 'setup',
    prompt: raw`The problem gives the ball’s total charge $Q$ and says only that $\rho=\rho_0(1-r/R)$. You have $Q_{\text{enc}}(r)$ in terms of $\rho_0$. What comes next?`,
    choices: [
      {correct: true, text: raw`Integrate over the whole ball, set it equal to $Q$ to find $\rho_0=3Q/(\pi R^3)$, and write the answer in $Q$.`},
      {text: raw`Leave $\rho_0$ in the answer: it is part of the density.`, misconception: 'rho0-unknown',
        why: raw`$\rho_0$ was not given; $Q$ was. An answer in $\rho_0$ is in a quantity the problem never named, and one line of integration turns it into $Q$.`},
      {text: raw`Set $\rho_0$ to the ball’s average density, $Q/(\frac43\pi R^3)$.`, misconception: 'rho0-unknown',
        why: raw`$\rho_0$ is the density at the centre, where its size is greatest. With a density that tends to zero at the surface, the centre’s is four times the average.`},
    ],
    explanation: raw`$\int_0^R\rho_0(1-r'/R)\,4\pi r'^2\,dr'=\pi\rho_0R^3/3$, and that must be $Q$, so $\rho_0=3Q/(\pi R^3)$. With it, $Q_{\text{enc}}=Q\big(4r^3/R^3-3r^4/R^4\big)$, in what the problem gave.`,
    review: {lesson: 'qenc', section: 'Normalising when you are given Q'}},

  {id: 'qenc-outside-limit', lesson: 'qenc', kind: 'check',
    prompt: raw`For a point outside the ball, $r>R$, a student writes $Q_{\text{enc}}=\int_0^{r}\rho_0(1-r'/R)\,4\pi r'^2\,dr'$. What is wrong?`,
    choices: [
      {correct: true, text: raw`There is no charge beyond $R$: the shells stop at $R$, and $Q_{\text{enc}}=Q$ for every $r>R$.`},
      {text: raw`Nothing: the upper limit is always the Gaussian sphere’s radius.`, misconception: 'qenc-limit',
        why: raw`The shells run to the Gaussian sphere or to the edge of the charge, whichever comes first. Outside the ball, the charge ends at $R$.`},
      {text: raw`Nothing: the density is zero at $R$, so the shells past $R$ add nothing anyway.`, misconception: 'qenc-limit',
        why: raw`The formula is zero at $R$ but changes sign past it, so integrating on would add charge of the opposite sign that is not there. The density beyond $R$ is zero because there is no ball there, not because of the formula.`},
    ],
    explanation: raw`Outside the ball the Gaussian sphere encloses all of it and nothing more, so $Q_{\text{enc}}=\int_0^R\rho\,4\pi r'^2\,dr'=Q$, a constant. Inside, the limit is $r$; outside, it is $R$.`,
    review: {lesson: 'qenc', section: 'The mistakes graders see most'}},

  {id: 'qenc-units', lesson: 'qenc', kind: 'check',
    prompt: raw`A student’s charge enclosed is $\int_0^r\rho\,dr'$. Which quick check catches the slip?`,
    choices: [
      {correct: true, text: raw`Its units: a charge per volume times a length is a charge per area, not a charge.`},
      {text: raw`None: its limits are right, so it is right.`, misconception: 'rho-dr',
        why: raw`The limits are right, but each shell’s volume is missing. Without its area, $4\pi r'^2$, the integral adds densities along a line.`},
      {text: raw`Whether it gives $Q$ at $r=R$; if it does after fixing $\rho_0$, it is right.`, misconception: 'rho-dr',
        why: raw`Fixing $\rho_0$ can force any expression to give $Q$ at $R$, and still be wrong everywhere inside. The units say it is not a charge at all.`},
    ],
    explanation: raw`$Q_{\text{enc}}$ must come out as a charge. $\rho$ is a charge per volume and $dr'$ a length, so $\int\rho\,dr'$ is a charge per area. Put the shell’s area back, $\int_0^r\rho\,4\pi r'^2\,dr'$, and the units come right.`,
    review: {lesson: 'qenc', section: 'The mistakes graders see most'}},

  {id: 'qenc-slab', lesson: 'qenc', kind: 'setup',
    prompt: raw`For the slab with $\rho=\rho_0(1-|z|/a)$, the pillbox’s faces, of area $A$, are at $z$ and $-z$, inside the slab. Which is the charge enclosed?`,
    choices: [
      {correct: true, tex: raw`2\int_0^{z}\rho_0\Big(1-\frac{z'}{a}\Big)A\,dz'`},
      {tex: raw`\int_0^{z}\rho_0\Big(1-\frac{z'}{a}\Big)A\,dz'`, misconception: 'pillbox-two',
        why: raw`That is the half above the middle plane. The pillbox reaches as far below it, to $-z$, and the density there is the same, so double it.`},
      {tex: raw`2\int_0^{a}\rho_0\Big(1-\frac{z'}{a}\Big)A\,dz'`, misconception: 'qenc-limit',
        why: raw`Out to $a$ adds the whole slab’s thickness, which is the charge for a pillbox outside the slab. With its faces inside, the slices stop at $z$.`},
    ],
    explanation: raw`A slice of area $A$ and thickness $dz'$ holds $\rho\,A\,dz'$. The pillbox runs from $-z$ to $z$ and the density is the same at $z'$ and $-z'$, so integrate from zero to $z$ and double, which also deals with $|z'|$: $Q_{\text{enc}}=2\rho_0A\big(z-z^2/2a\big)$.`,
    review: {lesson: 'qenc', stage: 'right', case: 'slab'}},

  {id: 'qenc-slab-area', lesson: 'qenc', kind: 'check',
    prompt: raw`A student finds the slab’s field inside to be $E_\perp=\dfrac{\rho_0A}{\varepsilon_0}\Big(z-\dfrac{z^2}{2a}\Big)$. What does the $A$ in it say?`,
    choices: [
      {correct: true, text: raw`That there is a slip: the face area is on both sides of the law and must cancel, since the pillbox is imaginary.`},
      {text: raw`That the field is stronger for a wider pillbox.`, misconception: 'size-left-in',
        why: raw`The pillbox is drawn by you, and the field cannot know how wide you drew it. A wider one encloses more charge and has more face area in the same proportion.`},
      {text: raw`Nothing: $A$ is part of the slab’s size, so it belongs in the field.`, misconception: 'size-left-in',
        why: raw`The slab is infinite in its other two directions; $A$ is the area of the pillbox’s faces, not of the slab. It appears as $2E_\perp A$ on the left and in $Q_{\text{enc}}$ on the right, and cancels.`},
    ],
    explanation: raw`Setting $2E_\perp A$ equal to $2\rho_0A(z-z^2/2a)/\varepsilon_0$, the $A$ cancels, giving $E_\perp=\frac{\rho_0}{\varepsilon_0}\big(z-\frac{z^2}{2a}\big)$. An $A$ or an $L$ left in a field is always a slip.`,
    review: {lesson: 'qenc', section: 'Check the answer', case: 'slab'}},

  {id: 'qenc-outer-half', lesson: 'qenc', kind: 'predict',
    prompt: raw`In the ball whose density changes from $\rho_0$ at its centre to zero at its surface, where does more of the charge lie: within half the radius, or in the outer half?`,
    choices: [
      {correct: true, text: raw`In the outer half: its shells are far larger, and that outweighs their thinner density.`},
      {text: raw`Within half the radius, where the density is greatest in size.`, misconception: 'rho-dr',
        why: raw`A shell’s charge is its density times its volume, and its volume grows as $r'^2$. Looking only at the density leaves out the shells’ areas.`},
      {text: raw`Half in each, since the density changes evenly from the centre to the surface.`, misconception: 'rho-dr',
        why: raw`The density changes evenly along a radius, but the shells do not have equal volumes: the outer ones are much bigger, so they hold more.`},
    ],
    explanation: raw`$Q_{\text{enc}}=Q\big(4r^3/R^3-3r^4/R^4\big)$, so within half the radius lies five sixteenths of the charge, and the outer half holds the other eleven sixteenths. The shells’ area, $4\pi r'^2$, wins over the falling density.`,
    review: {lesson: 'qenc', section: 'Easy to confuse with'}},

  {id: 'qenc-cylinder', lesson: 'qenc', kind: 'transfer',
    prompt: raw`A long cylinder of radius $R$ carries $\lambda$ per unit length, spread evenly through its volume. How much charge lies inside a coaxial cylinder of radius $r<R$ and length $L$?`,
    choices: [
      {correct: true, tex: raw`\lambda L\,\frac{r^2}{R^2}`},
      {tex: raw`\lambda L\,\frac{r^3}{R^3}`, misconception: 'ratio-power',
        why: raw`Cubes belong to a ball. Over the same length $L$, the two cylinders’ volumes are in the ratio of their cross sections, $\pi r^2$ over $\pi R^2$.`},
      {tex: raw`\lambda L`, misconception: 'qenc-total',
        why: raw`That is all the charge in a length $L$, enclosed only once the Gaussian cylinder is outside the charged one. Inside, it holds only the part within radius $r$.`},
    ],
    explanation: raw`A length $L$ of the charged cylinder holds $\lambda L$, spread evenly. The Gaussian cylinder takes the fraction of that volume inside it, $\pi r^2L/\pi R^2L=r^2/R^2$, so $Q_{\text{enc}}=\lambda L\,r^2/R^2$.`,
    review: {lesson: 'qenc', section: 'Uniform: the ratio method'}},
];
