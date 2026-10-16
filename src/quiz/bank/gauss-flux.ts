import type {Question} from '../types';
const raw = String.raw;

/* FLUX, THE IDEA, in its lesson's symbols (src/gauss/lessons/flux.ts): a flat patch of area A in a uniform field E,
 * its normal at the angle θ to the field, Φ = EA cos θ; a point charge q at the centre of a sphere of radius r,
 * Φ = q/ε₀ whatever r; a charge outside adding nothing. The flux has the sign of the charge inside. Every result
 * here is checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'flux-tilted-patch', lesson: 'flux', kind: 'setup',
    prompt: raw`A flat patch of area $A$ sits in a uniform field $\vec E$, its normal at the angle $\theta$ to the field. What is the flux through it?`,
    choices: [
      {correct: true, tex: raw`EA\cos\theta`},
      {tex: raw`EA\sin\theta`, misconception: 'angle-from-surface',
        why: raw`With $\theta$ measured from the normal, $E\sin\theta$ is the part of the field along the patch, the part that slides past. The part that goes through is $E\cos\theta$.`},
      {tex: raw`EA`, misconception: 'angle-from-surface',
        why: raw`That is the flux only when the patch faces the field square on, $\theta=0$. Tilted, it catches less: only the field’s part along the normal carries anything through.`},
    ],
    explanation: raw`The flux is the dot product of the field with the area vector, $\vec E\cdot\vec A=EA\cos\theta$: the field’s part along the normal, $E\cos\theta$, times the area. It is largest face on and zero edge on.`,
    review: {lesson: 'flux', section: 'Through a flat patch'}},

  {id: 'flux-angle-to-surface', lesson: 'flux', kind: 'transfer',
    prompt: raw`A problem says instead that the uniform field makes the angle $\beta$ with the patch’s surface itself. What is the flux through the patch?`,
    choices: [
      {correct: true, tex: raw`EA\sin\beta`},
      {tex: raw`EA\cos\beta`, misconception: 'angle-from-surface',
        why: raw`The cosine goes with the angle from the normal. An angle to the surface is the complement of that one, $\theta=\pi/2-\beta$, and $\cos\theta=\sin\beta$.`},
      {tex: raw`0`, misconception: 'angle-from-surface',
        why: raw`The flux is zero only when the field lies along the patch, $\beta=0$. At any other angle part of the field crosses it.`},
    ],
    explanation: raw`The angle in $EA\cos\theta$ is measured from the normal. The normal is perpendicular to the surface, so the angle from it is $\theta=\pi/2-\beta$, and the flux is $EA\cos(\pi/2-\beta)=EA\sin\beta$: zero when the field lies along the patch, $EA$ when it is perpendicular to it.`,
    review: {lesson: 'flux', section: 'The angle is from the normal'}},

  {id: 'flux-edge-on', lesson: 'flux', kind: 'predict',
    prompt: raw`Turn the patch until the uniform field slides along it. What are the flux through it and the field at it?`,
    choices: [
      {correct: true, text: raw`The flux is zero, but the field there is as strong as before.`},
      {text: raw`The flux is zero, so the field there is zero.`, misconception: 'zero-flux-zero-field',
        why: raw`The field is uniform: turning a patch in it changes nothing about it. Zero flux says only that none of it crosses the patch.`},
      {text: raw`The flux is the most it can be, $EA$, since the field runs along the whole patch.`, misconception: 'angle-from-surface',
        why: raw`Flux counts field going through a patch, not along it. Edge on, the angle from the normal is $\pi/2$, and $\cos(\pi/2)=0$.`},
    ],
    explanation: raw`Edge on, the field is perpendicular to the patch’s normal, so $\theta=\pi/2$ and $EA\cos\theta=0$. Nothing crosses the patch, yet the field there is the same uniform field it always was.`,
    review: {lesson: 'flux', section: 'The angle is from the normal'}},

  {id: 'flux-bigger-sphere', lesson: 'flux', kind: 'predict',
    prompt: raw`A point charge $q$ sits at the centre of a sphere. Double the sphere’s radius. What happens to the flux out through it?`,
    choices: [
      {correct: true, text: raw`Nothing: it stays $q/\varepsilon_0$.`},
      {text: raw`It grows four times over, since the area does.`, misconception: 'bigger-surface',
        why: raw`The area does grow four times over, but on the bigger sphere the field is a quarter as strong. The two trade off exactly.`},
      {text: raw`It falls to a quarter, since the field does.`, misconception: 'bigger-surface',
        why: raw`The field does fall to a quarter, but it crosses four times the area. Flux is field times area, and the product is unchanged.`},
    ],
    explanation: raw`On a sphere of radius $r$ the field is $q/(4\pi\varepsilon_0r^2)$ and the area $4\pi r^2$, so the $r^2$ cancels and the flux is $q/\varepsilon_0$ for every sphere round $q$.`,
    review: {lesson: 'flux', stage: 'solve'}},

  {id: 'flux-diameter', lesson: 'flux', kind: 'setup',
    prompt: raw`A point charge sits at the centre of a sphere whose diameter is $d$. On the sphere its field has the size $E$. What is the size of the flux through the sphere?`,
    choices: [
      {correct: true, tex: raw`\pi d^2E`},
      {tex: raw`4\pi d^2E`, misconception: 'diameter-radius',
        why: raw`$4\pi r^2$ takes the radius, and the radius is $d/2$. Putting in $d$ makes the area four times too big.`},
      {tex: raw`2\pi d^2E`, misconception: 'diameter-radius',
        why: raw`Halving the diameter is right, but the half is squared: $4\pi(d/2)^2=\pi d^2$, not $4\pi d^2/2$.`},
    ],
    explanation: raw`The field is the same size all over the sphere and perpendicular to it, so the flux is $E$ times the area. With $r=d/2$, the area is $4\pi(d/2)^2=\pi d^2$.`,
    review: {lesson: 'flux', section: 'Round a point charge'}},

  {id: 'flux-charge-outside', lesson: 'flux', kind: 'predict',
    prompt: raw`A point charge sits outside a closed surface. What are the net flux through the surface and the field on it?`,
    choices: [
      {correct: true, text: raw`The net flux is zero, but the field on the surface is not: it goes in on one side and out on the other.`},
      {text: raw`The flux is zero because the charge’s field does not reach the surface.`, misconception: 'zero-flux-zero-field',
        why: raw`A point charge’s field reaches everywhere, weaker with distance. It crosses the surface; it only crosses it in as much as out.`},
      {text: raw`The flux is not zero: the side facing the charge sees a stronger field than the far side.`, misconception: 'bigger-surface',
        why: raw`The near side does see a stronger field, but seen from the charge it fills the same cone of directions as the far side. Equal cones carry equal flux, in on one side and out on the other.`},
    ],
    explanation: raw`Every cone of directions from the charge that meets the surface crosses it twice, once going in and once coming out, and carries equal flux of opposite sign at the two crossings. The net flux is zero, though the field is nowhere zero on the surface.`,
    review: {lesson: 'flux', section: 'A charge outside'}},

  {id: 'flux-two-charges', lesson: 'flux', kind: 'transfer',
    prompt: raw`A closed surface encloses a charge $q_1$, and a charge $q_2$ sits outside it. What is the flux out through the surface?`,
    choices: [
      {correct: true, tex: raw`\frac{q_1}{\varepsilon_0}`},
      {tex: raw`\frac{q_1+q_2}{\varepsilon_0}`, misconception: 'outside-counts',
        why: raw`$q_2$’s field crosses the surface in as much as out, so it adds nothing to the net flux, wherever outside it sits.`},
      {tex: raw`\frac{q_1-q_2}{\varepsilon_0}`, misconception: 'outside-counts',
        why: raw`A charge outside does not take flux away either. Every cone from $q_2$ crosses the surface twice, in and out, and the two crossings cancel.`},
    ],
    explanation: raw`Fields add, so fluxes add: $q_1$, inside, gives $q_1/\varepsilon_0$, and $q_2$, outside, gives zero. The flux is $q_1/\varepsilon_0$. The field on the surface is the sum of both charges’ fields; only its net flux ignores $q_2$.`,
    review: {lesson: 'flux', section: 'A charge outside'}},

  {id: 'flux-negative', lesson: 'flux', kind: 'check',
    prompt: raw`A negative point charge $q$ sits at the centre of a sphere. Which is right about the flux out through it?`,
    choices: [
      {correct: true, text: raw`It is $q/\varepsilon_0$, which is negative: on every patch the field points in, against the outward $d\vec A$.`},
      {text: raw`It is $|q|/\varepsilon_0$: flux measures how much field passes through, and that cannot be negative.`, misconception: 'sign',
        why: raw`Flux is a dot product with the outward area vector, so it has a sign. Field going in counts as negative flux, and a negative charge’s field goes in through every patch.`},
      {text: raw`It is zero: the field ends on the charge, so none of it leaves the sphere.`, misconception: 'sign',
        why: raw`Field going in counts as much as field coming out, with the other sign. None leaves, and all of it enters: the flux is $q/\varepsilon_0$, negative.`},
    ],
    explanation: raw`On every patch $\vec E\cdot d\vec A=E_r\,dA$, and $E_r$ has the sign of $q$. For a negative charge every patch carries flux in, and the total is $q/\varepsilon_0$, negative: net inward.`,
    review: {lesson: 'flux', section: 'Round a point charge'}},

  {id: 'flux-zero-says', lesson: 'flux', kind: 'check',
    prompt: raw`The charges inside a closed surface add to zero, so the net flux through it is zero. What does that say about the field on the surface?`,
    choices: [
      {correct: true, text: raw`Nothing by itself: the field may be strong there, crossing in on one part and out on another.`},
      {text: raw`It is zero at every point of the surface.`, misconception: 'zero-flux-zero-field',
        why: raw`Zero net flux allows field going in and coming out in equal amounts. A positive and a negative charge inside make a field that leaves near the positive one and enters near the negative.`},
      {text: raw`It is zero unless there is charge outside the surface.`, misconception: 'zero-flux-zero-field',
        why: raw`Charge inside that adds to zero can still make a field: a positive and a negative charge side by side do, all over the surface, with nothing outside at all.`},
    ],
    explanation: raw`Gauss’s law fixes the total, $\oint\vec E\cdot d\vec A=Q_{\text{enc}}/\varepsilon_0$, not the field at each point. Zero says the inward and outward flux balance; only a symmetry that makes the field the same and perpendicular to the surface everywhere would turn that into zero field.`,
    review: {lesson: 'flux', section: 'Two traps'}},
];
