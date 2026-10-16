import type {Question} from '../types';
const raw = String.raw;

/* SPHERES, in its lesson's symbols (src/gauss/lessons/spheres.ts): four charges of total charge Q, the last three of
 * radius R: a point charge, a thin shell with σ = Q/(4πR²), a uniform ball, and a ball with ρ = ρ₀r/R, so that
 * ρ₀ = Q/(πR³). A concentric sphere of radius r gives E_r = kQ_enc(r)/r², E_r negative where the field points in.
 * Every result here is checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'spheres-shell-inside', lesson: 'spheres', kind: 'predict',
    prompt: raw`What is the field inside the thin uniform shell, at a point away from its centre?`,
    choices: [
      {correct: true, text: raw`Zero, at every point inside, not only at the centre.`},
      {text: raw`Zero only at the centre. Off it, the near side of the shell, being closer, wins.`, misconception: 'shell-inside',
        why: raw`The near side is closer, but there is less of it in each cone of directions from the point, and the far side, with more charge farther off, makes up for it exactly.`},
      {text: raw`Zero only at the centre. Off it, the far side, holding more of the charge, wins.`, misconception: 'shell-inside',
        why: raw`The far side does hold more charge in each cone, but it is farther off by just the amount that makes its field at the point the same as the near side’s, in the opposite direction.`},
    ],
    explanation: raw`A concentric sphere through any inner point encloses none of the shell’s charge, so its flux is zero. Symmetry makes the field radial and the same all over that sphere, so the field itself must be zero there, at every radius inside the shell.`,
    review: {lesson: 'spheres', stage: 'solve', case: 'shell'}},

  {id: 'spheres-ball-inside', lesson: 'spheres', kind: 'setup',
    prompt: raw`Inside the uniform ball, at a radius $r<R$, what is $E_r$?`,
    choices: [
      {correct: true, tex: raw`\frac{kQr}{R^3}`},
      {tex: raw`\frac{kQ}{r^2}`, misconception: 'qenc-total',
        why: raw`That counts the whole ball’s charge, but a sphere of radius $r$ inside the ball encloses only $Qr^3/R^3$ of it. The field would then grow without end toward the centre, where it is in fact zero.`},
      {tex: raw`\frac{kQ}{R^2}`, misconception: 'ratio-power',
        why: raw`That follows from taking $Qr^2/R^2$ inside, the fraction of the area. The charge fills the volume, so the fraction is $r^3/R^3$, and the field grows as $r$ instead of staying level.`},
    ],
    explanation: raw`The sphere of radius $r$ encloses $Q_{\text{enc}}=Qr^3/R^3$, so $E_r(4\pi r^2)=Qr^3/(R^3\varepsilon_0)$ and $E_r=kQr/R^3$: zero at the centre, growing in proportion to $r$, reaching $kQ/R^2$ at the surface.`,
    review: {lesson: 'spheres', stage: 'right', case: 'ball'}},

  {id: 'spheres-rising-qenc', lesson: 'spheres', kind: 'setup',
    prompt: raw`The ball’s density rises as $\rho=\rho_0r/R$, and its total charge is $Q$. In terms of what the problem gives, $Q$, $R$ and $r$, what is the charge inside $r<R$?`,
    choices: [
      {correct: true, tex: raw`Q\,\frac{r^4}{R^4}`},
      {tex: raw`Q\,\frac{r^3}{R^3}`, misconception: 'ratio-power',
        why: raw`The ratio of volumes holds only for a uniform density. Here less of the charge lies near the centre, so a sphere inside holds a smaller fraction than its share of the volume.`},
      {tex: raw`\frac{\pi\rho_0r^4}{R}`, misconception: 'rho0-unknown',
        why: raw`That is right in $\rho_0$, but $\rho_0$ was not given. Out to $R$ the same integral is $\pi\rho_0R^3$, which must be $Q$; put $\rho_0=Q/(\pi R^3)$ in.`},
      {tex: raw`Q\,\frac{r^2}{R^2}`, misconception: 'rho-dr',
        why: raw`That is what $\int\rho\,dr'$ gives once fixed to reach $Q$ at $R$. It leaves out each shell’s area, $4\pi r'^2$, which is why it grows too fast near the centre.`},
    ],
    explanation: raw`By thin shells, $\int_0^r\rho_0\frac{r'}{R}\,4\pi r'^2\,dr'=\pi\rho_0r^4/R$. At $r=R$ that is $\pi\rho_0R^3=Q$, so $\rho_0=Q/(\pi R^3)$ and $Q_{\text{enc}}=Qr^4/R^4$. Then $E_r=kQr^2/R^4$ inside.`,
    review: {lesson: 'spheres', stage: 'right', case: 'rising'}},

  {id: 'spheres-mismatch', lesson: 'spheres', kind: 'check',
    prompt: raw`For a ball with a finite density, your inside answer gives $E_r=2kQ/R^2$ at $r=R$, and your outside answer gives $kQ/R^2$ there. What does that say?`,
    choices: [
      {correct: true, text: raw`There is a slip. With a finite density no charge sits on the surface itself, so the two answers must meet at $R$.`},
      {text: raw`Nothing: the field always jumps at the surface of a ball.`, misconception: 'boundary-match',
        why: raw`A jump needs a finite charge on a surface of no thickness. A ball’s charge is spread through its volume, so $Q_{\text{enc}}$ changes smoothly through $R$, and so does the field.`},
      {text: raw`That the field jumps by $\sigma/\varepsilon_0$ there, as it does across any surface.`, misconception: 'boundary-match',
        why: raw`The jump is across a surface charge, and a ball with a finite density has none: its $\sigma$ is zero. The two answers must agree.`},
    ],
    explanation: raw`$E_r=kQ_{\text{enc}}(r)/r^2$, and with a finite density $Q_{\text{enc}}$ is continuous: just inside $R$ and just outside, the sphere encloses the same charge, $Q$. So both answers must give $kQ/R^2$ at $R$; a mismatch is an algebra slip.`,
    review: {lesson: 'spheres', section: 'Continuous, or a jump'}},

  {id: 'spheres-shell-jump', lesson: 'spheres', kind: 'check',
    prompt: raw`Just inside the thin shell $E_r=0$, and just outside it $E_r=kQ/R^2$. Is that a slip?`,
    choices: [
      {correct: true, text: raw`No. A finite charge sits on a surface of no thickness, and the field jumps across it by $\sigma/\varepsilon_0$, with $\sigma=Q/(4\pi R^2)$.`},
      {text: raw`Yes: the inside and outside answers must always meet at $R$.`, misconception: 'boundary-match',
        why: raw`They must meet for a finite density. A shell’s charge is all on one surface, so $Q_{\text{enc}}$ steps from zero to $Q$ as the sphere crosses it, and the field steps with it.`},
      {text: raw`Yes: just inside, the field must be $kQ/R^2$ too, since the charge is right there.`, misconception: 'shell-inside',
        why: raw`However close to the shell, a sphere just inside it encloses none of its charge, and the field there is zero, like everywhere else inside.`},
    ],
    explanation: raw`$Q_{\text{enc}}$ is zero for a sphere just inside the shell and $Q$ just outside, so the field steps from zero to $kQ/R^2$. With $\sigma=Q/(4\pi R^2)$ and $k=1/(4\pi\varepsilon_0)$, that step is $\sigma/\varepsilon_0$, as across any surface charge.`,
    review: {lesson: 'spheres', section: 'Check the answer', case: 'shell'}},

  {id: 'spheres-outside-same', lesson: 'spheres', kind: 'predict',
    prompt: raw`Outside $R$, how do the fields compare: the point charge’s, the shell’s, the uniform ball’s and the rising-density ball’s, all of total charge $Q$?`,
    choices: [
      {correct: true, text: raw`They are the same, $kQ/r^2$: outside, every one of them makes a point charge’s field.`},
      {text: raw`The point charge’s is strongest, since its charge is the most concentrated.`, misconception: 'outside-point',
        why: raw`Outside, a concentric sphere encloses all of each one’s charge, $Q$, however it is spread. Concentration shows only inside.`},
      {text: raw`The shell’s is weakest, since its charge is the farthest out.`, misconception: 'outside-point',
        why: raw`A sphere outside the shell encloses its whole charge, as it does each of the others, and symmetry spreads the flux evenly, so the field is the same $kQ/r^2$.`},
    ],
    explanation: raw`Outside $R$, the Gaussian sphere encloses the whole of each charge, so $E_r(4\pi r^2)=Q/\varepsilon_0$ for all four and $E_r=kQ/r^2$: exactly a point charge’s, not only far away. The plot under the figure shows them as one curve beyond $R$.`,
    review: {lesson: 'spheres', section: 'Continuous, or a jump'}},

  {id: 'spheres-rising-vs-uniform', lesson: 'spheres', kind: 'predict',
    prompt: raw`At the same $r<R$, with the same $Q$ and $R$, which field is larger in size: the uniform ball’s or the rising-density ball’s?`,
    choices: [
      {correct: true, text: raw`The uniform ball’s: the rising density puts less of the charge near the centre, so less of it is inside any $r<R$.`},
      {text: raw`The rising-density ball’s, since its density near the surface is higher.`, misconception: 'local-density',
        why: raw`The field at $r$ is set by the charge inside $r$, not by the density at $r$. Inside any $r<R$, the rising ball holds less charge than the uniform one.`},
      {text: raw`They are the same, since both balls hold $Q$.`, misconception: 'qenc-total',
        why: raw`Both hold $Q$ in all, but inside $r$ the uniform ball encloses $Qr^3/R^3$ and the rising one only $Qr^4/R^4$. They agree only from $R$ outward.`},
    ],
    explanation: raw`$E_r=kQ_{\text{enc}}/r^2$. The uniform ball gives $kQr/R^3$ and the rising one $kQr^2/R^4$, smaller by the factor $r/R$ at every $r$ inside. They meet at the surface, at $kQ/R^2$.`,
    review: {lesson: 'spheres', section: 'Check the answer', case: 'rising'}},

  {id: 'spheres-negative-ball', lesson: 'spheres', kind: 'transfer',
    prompt: raw`Give the uniform ball a negative charge $Q$. What is $E_r$ inside it, and which way does the field point?`,
    choices: [
      {correct: true, text: raw`$E_r=kQr/R^3$, now negative: the field points in, toward the centre, and is largest in size at the surface.`},
      {text: raw`$E_r=k|Q|r/R^3$, pointing out, since the size of a field cannot be negative.`, misconception: 'sign',
        why: raw`$E_r$ is a signed component along $\hat{\mathbf r}$, not a size. A negative charge turns every arrow round, so $E_r$ takes the sign of $Q$ and the field points in.`},
      {text: raw`$E_r=kQr/R^3$, pointing out, since $E_r$ is the outward part.`, misconception: 'sign',
        why: raw`$E_r$ is the part along the outward direction, which comes out negative when the field points the other way. For a negative $Q$ it is negative: the field points in.`},
    ],
    explanation: raw`Nothing in the argument used the sign: $Q_{\text{enc}}=Qr^3/R^3$ and $E_r=kQr/R^3$ for either sign. For a negative $Q$, $E_r$ is negative at every $r$, so the field points in, growing in size from zero at the centre to $k|Q|/R^2$ at the surface.`,
    review: {lesson: 'spheres', section: 'Check the answer', case: 'ball'}},

  {id: 'spheres-diameter', lesson: 'spheres', kind: 'transfer',
    prompt: raw`A thin uniform shell of diameter $D$ carries a charge $Q$. What is $E_r$ just outside it?`,
    choices: [
      {correct: true, tex: raw`\frac{4kQ}{D^2}`},
      {tex: raw`\frac{kQ}{D^2}`, misconception: 'diameter-radius',
        why: raw`The distance from the centre is the radius, $D/2$, not the diameter. Squared, the half becomes a quarter, and the field four times what $kQ/D^2$ says.`},
      {tex: raw`0`, misconception: 'boundary-match',
        why: raw`Zero is the field just inside the shell. Just outside, a sphere encloses all of its charge, and the field has jumped to a point charge’s.`},
    ],
    explanation: raw`Just outside, a concentric sphere of radius $D/2$ encloses all of $Q$, so $E_r=kQ/(D/2)^2=4kQ/D^2$.`,
    review: {lesson: 'spheres', stage: 'solve', case: 'shell'}},

  {id: 'spheres-zero-flux-zero-field', lesson: 'spheres', kind: 'check',
    prompt: raw`A Gaussian sphere inside the shell encloses no charge, so its flux is zero. Why does that give zero field there, when zero flux alone would not?`,
    choices: [
      {correct: true, text: raw`Symmetry: the field is radial and the same size all over that sphere, so its flux can be zero only if the field is zero.`},
      {text: raw`It needs no symmetry: zero flux always means zero field.`, misconception: 'zero-flux-zero-field',
        why: raw`Zero flux allows field going in on one side and out on the other. Only a field that is the same and perpendicular to the surface everywhere cannot do that.`},
      {text: raw`Because there is no charge outside that sphere either.`, misconception: 'only-inside-field',
        why: raw`There is: the whole shell lies outside it. Its field counts toward $\vec E$; it is zero inside because of the shell’s symmetry, not because the shell is outside.`},
    ],
    explanation: raw`On a concentric sphere inside the shell, $\oint\vec E\cdot d\vec A=E_r(4\pi r^2)$, and that is zero. With $E_r$ the same on every patch, the only way is $E_r=0$. Without the symmetry, zero flux would say nothing about the field at any one point.`,
    review: {lesson: 'spheres', section: 'Check the answer', case: 'shell'}},
];
