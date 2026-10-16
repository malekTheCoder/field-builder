import type {Question} from '../types';
const raw = String.raw;

/* THE HARD CASES, in its lesson's symbols (src/gauss/lessons/hard.ts): a halo with no edge, ρ = ρ₀a²/(r² + a²); a ball
 * of radius R with ρ = β/r; a ball whose field is given, E_r = E_R r²/R², its density to be found; a slab between z =
 * minus a and z = a with ρ = ρ₀z/a; and the flux from a charge q through a square of side 2b, a distance d from it on
 * its axis. E_r and E_z are signed. Every result here is checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'hard-halo-far', lesson: 'hard', kind: 'predict',
    prompt: raw`Far out in the halo, $r\gg a$, how does its field fall with $r$?`,
    choices: [
      {correct: true, text: raw`As $1/r$: the charge inside keeps growing, in step with $r$, however far out the sphere.`},
      {text: raw`As $1/r^2$, like any charge seen from far away.`, misconception: 'qenc-limit',
        why: raw`A point charge’s fall-off needs the charge inside to stop growing. The halo has no edge: each shell far out holds about $4\pi\rho_0a^2\,dr$, so the charge inside grows in step with $r$ for good.`},
      {text: raw`As $1/r^4$: the density falls as $1/r^2$ on top of the inverse square.`, misconception: 'local-density',
        why: raw`The field at $r$ is set by all the charge inside $r$, not by the density at $r$. That charge keeps growing, so the field falls more slowly than $1/r^2$, not faster.`},
    ],
    explanation: raw`Far out, $Q_{\text{enc}}\approx4\pi\rho_0a^2r$, so $E_r(4\pi r^2)=Q_{\text{enc}}/\varepsilon_0$ gives $E_r\approx\rho_0a^2/(\varepsilon_0r)$: it heads for $1/r$, never $1/r^2$, out for a positive $\rho_0$ and in for a negative one.`,
    review: {lesson: 'hard', stage: 'solve', case: 'halo'}},

  {id: 'hard-halo-centre', lesson: 'hard', kind: 'check',
    prompt: raw`Close to the halo’s centre, $r\ll a$, which field should your answer reduce to?`,
    choices: [
      {correct: true, text: raw`A uniform ball’s, $\rho_0r/(3\varepsilon_0)$: so close in, the density has hardly begun to fall from $\rho_0$.`},
      {text: raw`A point charge’s, $kQ/r^2$, with $Q$ the halo’s charge.`, misconception: 'qenc-total',
        why: raw`A small sphere near the centre encloses only the little charge inside it, $\frac43\pi\rho_0r^3$ or so, not the halo’s, which has no finite total anyway.`},
      {text: raw`A uniform rod’s, $\rho_0r/(2\varepsilon_0)$.`, misconception: 'ratio-power',
        why: raw`The two belongs to a cylinder, whose volume grows as $r^2$. A sphere’s grows as $r^3$, and over its area $4\pi r^2$ that leaves $r/3$.`},
    ],
    explanation: raw`For $r\ll a$ the arctangent is nearly $r/a-r^3/(3a^3)$, so $Q_{\text{enc}}\approx\frac43\pi\rho_0r^3$ and $E_r\approx\rho_0r/(3\varepsilon_0)$: a uniform ball of density $\rho_0$, which is what the halo looks like up close.`,
    review: {lesson: 'hard', section: 'Check the answer', case: 'halo'}},

  {id: 'hard-cusp-qenc', lesson: 'hard', kind: 'setup',
    prompt: raw`Inside the ball with $\rho=\beta/r$, how much charge does a sphere of radius $r<R$ enclose?`,
    choices: [
      {correct: true, tex: raw`2\pi\beta r^2`},
      {text: raw`An infinite amount, since the density is infinite at the centre`, misconception: 'rho-dr',
        why: raw`$\int\beta\,dr'/r'$ would be infinite, but that leaves out each shell’s area. With it, $\frac{\beta}{r'}\,4\pi r'^2\,dr'=4\pi\beta r'\,dr'$: the small shells near the centre swallow the $1/r'$.`},
      {tex: raw`\frac43\pi\beta r^2`, misconception: 'volume-as-dv',
        why: raw`That multiplies the density at $r$ by the whole volume inside it, as if the density were $\beta/r$ throughout. Add thin shells, $\frac{\beta}{r'}\,4\pi r'^2\,dr'$, from zero to $r$.`},
    ],
    explanation: raw`By thin shells, $\int_0^r\frac{\beta}{r'}\,4\pi r'^2\,dr'=\int_0^r4\pi\beta r'\,dr'=2\pi\beta r^2$: finite, though the density at the centre is not. The whole ball holds $2\pi\beta R^2$.`,
    review: {lesson: 'hard', stage: 'right', case: 'cusp'}},

  {id: 'hard-cusp-field', lesson: 'hard', kind: 'predict',
    prompt: raw`Inside the ball with $\rho=\beta/r$, how does the field change from place to place?`,
    choices: [
      {correct: true, text: raw`Its size is the same at every radius, $|\beta|/(2\varepsilon_0)$, but it still points radially, along $\hat{\mathbf r}$ or against it, and $\hat{\mathbf r}$ turns from place to place.`},
      {text: raw`It grows without bound toward the centre, as the density does.`, misconception: 'local-density',
        why: raw`The field at $r$ is set by the charge inside $r$, $2\pi\beta r^2$, not by the density at $r$. Over the sphere’s $4\pi r^2$ the $r^2$ cancels, and the size stays level.`},
      {text: raw`It is uniform: the same vector everywhere inside the ball.`, misconception: 'symmetry-forbids',
        why: raw`The ball is round, so its field is radial, and a radial field points different ways at different places. Only its size is the same.`},
    ],
    explanation: raw`$E_r(4\pi r^2)=2\pi\beta r^2/\varepsilon_0$ gives $E_r=\beta/(2\varepsilon_0)$, with no $r$ left. As a vector it is $\beta\hat{\mathbf r}/(2\varepsilon_0)$: the same size everywhere inside, out for a positive $\beta$ and in for a negative one.`,
    review: {lesson: 'hard', stage: 'solve', case: 'cusp'}},

  {id: 'hard-backwards', lesson: 'hard', kind: 'setup',
    prompt: raw`Inside the ball the field is given, $E_r=E_R\,r^2/R^2$, so $Q_{\text{enc}}(r)=4\pi\varepsilon_0E_Rr^4/R^2$. What is the density at $r$?`,
    choices: [
      {correct: true, tex: raw`\rho=\frac{4\varepsilon_0E_R\,r}{R^2}`},
      {tex: raw`\rho=\frac{3\varepsilon_0E_R\,r}{R^2}`, misconception: 'density-from-field',
        why: raw`That is $Q_{\text{enc}}$ divided by $\frac43\pi r^3$: the average density inside $r$, not the density at $r$. The density is how fast $Q_{\text{enc}}$ grows, per unit of shell volume.`},
      {tex: raw`\rho=\frac{2\varepsilon_0E_R\,r}{R^2}`, misconception: 'density-from-field',
        why: raw`That is $\varepsilon_0\,dE_r/dr$, the derivative of the field alone. A sphere’s area grows as $r^2$ too, so the density is $\frac{\varepsilon_0}{r^2}\frac{d}{dr}\big(r^2E_r\big)$, with the $r^2$ inside the derivative.`},
    ],
    explanation: raw`The charge in a thin shell is $\rho\,4\pi r^2\,dr$, so $\rho=\frac{1}{4\pi r^2}\frac{dQ_{\text{enc}}}{dr}=\frac{16\pi\varepsilon_0E_Rr^3}{4\pi r^2R^2}=\frac{4\varepsilon_0E_Rr}{R^2}$, growing in size from zero at the centre and of the sign of $E_R$.`,
    review: {lesson: 'hard', stage: 'solve', case: 'backwards'}},

  {id: 'hard-odd-middle', lesson: 'hard', kind: 'predict',
    prompt: raw`For the slab with $\rho=\rho_0z/a$, what does a pillbox standing across its middle, faces at $z$ and $-z$, tell you?`,
    choices: [
      {correct: true, text: raw`Nothing new: it holds no net charge, and with the field below pointing the same way as above, its two faces’ fluxes cancel whatever the field’s size.`},
      {text: raw`That the field inside is zero: $2E_\perp A=0$.`, misconception: 'mirror-assumed',
        why: raw`$2E_\perp A$ assumes the field below mirrors the field above. Flipping this slab turns its charge into its opposite, so the field below points the same way as above, and the faces’ fluxes cancel whatever the field is.`},
      {text: raw`$E_\perp=\rho_0z^2/(2\varepsilon_0a)$, from the charge from zero to $z$, doubled.`, misconception: 'mirror-assumed',
        why: raw`Doubling works when the charge below the middle mirrors the charge above. Here the charge below is the opposite, so the pillbox holds none at all.`},
    ],
    explanation: raw`The charge from $-z$ to $z$ adds to zero, and the faces carry $E_zA$ and $-E_zA$, which also add to zero: true, and empty. A pillbox with its bottom face below the slab, where there is no field, does the work instead.`,
    review: {lesson: 'hard', stage: 'surface', case: 'odd'}},

  {id: 'hard-odd-field', lesson: 'hard', kind: 'setup',
    prompt: raw`A pillbox has its bottom face below the slab, where there is no field, and its top face at a height $z$ inside it. What is $E_z$ there?`,
    choices: [
      {correct: true, tex: raw`E_z=\frac{\rho_0}{2\varepsilon_0a}\big(z^2-a^2\big)`},
      {tex: raw`E_z=\frac{\rho_0z^2}{2\varepsilon_0a}`, misconception: 'qenc-limit',
        why: raw`That adds the charge from the middle up to $z$. The pillbox starts below the slab, so its charge runs from the slab’s lower face, $-a$, up to $z$.`},
      {tex: raw`E_z=\frac{\rho_0}{4\varepsilon_0a}\big(z^2-a^2\big)`, misconception: 'mirror-assumed',
        why: raw`That divides by $2A$, as if both faces carried flux. The bottom face is where there is no field, so only the top face carries any: the left side is $E_zA$.`},
    ],
    explanation: raw`Only the top face carries flux, $E_zA$, and the box holds $\int_{-a}^{z}\frac{\rho_0z'}{a}A\,dz'=\frac{\rho_0A}{2a}(z^2-a^2)$. So $E_z=\rho_0(z^2-a^2)/(2\varepsilon_0a)$, zero at both faces and largest in size at the middle.`,
    review: {lesson: 'hard', stage: 'solve', case: 'odd'}},

  {id: 'hard-odd-outside', lesson: 'hard', kind: 'check',
    prompt: raw`Why is there no field outside the slab with $\rho=\rho_0z/a$?`,
    choices: [
      {correct: true, text: raw`Cut it into thin sheets. Above the whole slab every sheet is below, so each adds its own signed $\sigma/(2\varepsilon_0)$ to $E_z$, and their fields add as their charges do: to zero. Below it, the same.`},
      {text: raw`Because a pillbox across its middle has zero flux.`, misconception: 'zero-flux-zero-field',
        why: raw`That pillbox has zero flux whatever the field is, since its two faces’ fluxes cancel. It cannot show the field is zero anywhere.`},
      {text: raw`There is a field outside: the upper half’s, above it, and the lower half’s, below it.`, misconception: 'plates-add',
        why: raw`Each half’s field reaches to both sides. Above the slab, the upper half’s field and the lower half’s are equal and opposite, as outside a capacitor’s plates.`},
    ],
    explanation: raw`A thin sheet of charge $\sigma$ makes $\sigma/(2\varepsilon_0)$ on each side, away from it for a positive $\sigma$. Above the whole slab every sheet is below, so the field there is $\frac{1}{2\varepsilon_0}$ times their total charge per area, $\int_{-a}^{a}\rho_0z/a\,dz=0$: no field, above or below.`,
    review: {lesson: 'hard', section: 'Check the answer', case: 'odd'}},

  {id: 'hard-odd-direction', lesson: 'hard', kind: 'transfer',
    prompt: raw`Inside the slab with $\rho=\rho_0z/a$, which way does the field point?`,
    choices: [
      {correct: true, text: raw`From the half with positive charge toward the half with negative charge, the same way on both sides of the middle: down for a positive $\rho_0$, up for a negative one.`},
      {text: raw`Away from the middle on both sides, as for a uniform slab.`, misconception: 'mirror-assumed',
        why: raw`That mirror holds for a slab that is the same above and below its middle. This one’s halves carry opposite charges, so the field runs one way straight through it.`},
      {text: raw`From the half with negative charge toward the half with positive charge.`, misconception: 'sign',
        why: raw`A field points away from positive charge and toward negative charge, so between the halves it runs from the positive one to the negative one.`},
    ],
    explanation: raw`$E_z=\rho_0(z^2-a^2)/(2\varepsilon_0a)$ has the sign opposite to $\rho_0$ at every height inside, since $z^2<a^2$. For a positive $\rho_0$ the upper half is positive and $E_z$ is negative: downward, from the positive half to the negative one. Like a thick capacitor.`,
    review: {lesson: 'hard', section: 'A slab whose charge changes sign'}},

  {id: 'hard-square', lesson: 'hard', kind: 'transfer',
    prompt: raw`A charge $q$ sits on the axis of a square of side $2b$, a distance $d$ from it. Let the square grow without end, $b\to\infty$. What flux goes through it, away from $q$?`,
    choices: [
      {correct: true, tex: raw`\frac{q}{2\varepsilon_0}`},
      {tex: raw`\frac{q}{\varepsilon_0}`, misconception: 'bigger-surface',
        why: raw`An endless plane fills only half the directions out of $q$, those heading its way. The other half leave on the far side, so the plane carries half of $q/\varepsilon_0$.`},
      {text: raw`An infinite flux, since the plane is infinite`, misconception: 'bigger-surface',
        why: raw`A patch carries flux in proportion to the cone of directions it fills, seen from $q$, and however far the plane runs it fills no more than half of them. Far patches are tilted and weak.`},
    ],
    explanation: raw`The integral gives $\frac{q}{\pi\varepsilon_0}\arctan\frac{b^2}{d\sqrt{d^2+2b^2}}$, and as $b\to\infty$ the arctangent tends to $\pi/2$: the flux is $q/(2\varepsilon_0)$, of the sign of $q$. With $d=b$ it is $\pi/6$ instead, and the flux $q/(6\varepsilon_0)$: one face of a cube round $q$.`,
    review: {lesson: 'hard', section: 'A flux integral you have to do'}},
];
