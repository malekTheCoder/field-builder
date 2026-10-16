import type {Question} from '../types';
const raw = String.raw;

/* WHY ONLY THE CHARGE INSIDE, in its lesson's symbols (src/gauss/lessons/inside.ts): a point charge q and a sphere of
 * radius r, the charge at the centre, off it, or outside; a patch dA a distance s from q, its normal at α to the line
 * from q, filling the solid angle dΩ = dA cos α / s²; many charges by superposition; the capacitor's plates σ and
 * minus σ. Every result here is checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'inside-off-centre', lesson: 'inside', kind: 'predict',
    prompt: raw`Move the point charge from the centre of the sphere to a place near its surface, still inside. What happens to the flux out through the sphere?`,
    choices: [
      {correct: true, text: raw`Nothing: it stays $q/\varepsilon_0$, though the patches near the charge now carry more of it.`},
      {text: raw`It grows, since the charge is now close to part of the surface.`, misconception: 'bigger-surface',
        why: raw`The near patches do carry more, but the far ones carry less. Seen from the charge the sphere still fills every direction once, and the total is the same.`},
      {text: raw`It shrinks, since most of the sphere is now farther from the charge.`, misconception: 'bigger-surface',
        why: raw`A farther patch sees a weaker field, but it also fills its cone with more area. A patch carries flux in proportion to the cone it fills, so the total stays $q/\varepsilon_0$.`},
    ],
    explanation: raw`Each patch carries $q/(4\pi\varepsilon_0)$ times the solid angle it fills, seen from $q$. Wherever $q$ sits inside, the sphere surrounds it and fills the whole solid angle, $4\pi$, so the flux is $q/\varepsilon_0$; only how it is shared among the patches changes.`,
    review: {lesson: 'inside', stage: 'solve', case: 'off'}},

  {id: 'inside-patch', lesson: 'inside', kind: 'setup',
    prompt: raw`A patch $dA$ of the surface is a distance $s$ from $q$, its outward normal at the angle $\alpha$ to the line from $q$. What flux does it carry?`,
    choices: [
      {correct: true, tex: raw`\frac{q}{4\pi\varepsilon_0}\,\frac{dA\cos\alpha}{s^2}`},
      {tex: raw`\frac{q}{4\pi\varepsilon_0}\,\frac{dA}{s^2}`, misconception: 'angle-from-surface',
        why: raw`That is the field’s size times the patch’s area. A tilted patch is crossed only by the field’s part along its normal, which brings in $\cos\alpha$.`},
      {tex: raw`\frac{q}{4\pi\varepsilon_0}\,\frac{dA\sin\alpha}{s^2}`, misconception: 'angle-from-surface',
        why: raw`$\alpha$ is measured from the normal, so $\sin\alpha$ picks out the part of the field along the patch, the part that slides past it.`},
    ],
    explanation: raw`The field there is $q/(4\pi\varepsilon_0s^2)$ along the line from $q$, and its part along the patch’s normal is that times $\cos\alpha$. Times the area, $d\Phi=\frac{q}{4\pi\varepsilon_0}\,\frac{dA\cos\alpha}{s^2}=\frac{q}{4\pi\varepsilon_0}\,d\Omega$: the distance and the tilt drop out together into the solid angle.`,
    review: {lesson: 'inside', stage: 'left', case: 'off'}},

  {id: 'inside-whole-angle', lesson: 'inside', kind: 'setup',
    prompt: raw`Seen from a point charge inside a closed surface, what total solid angle does the surface fill?`,
    choices: [
      {correct: true, tex: raw`4\pi`},
      {tex: raw`4\pi r^2`, misconception: 'bigger-surface',
        why: raw`That is a sphere’s area, which grows with its size. A solid angle is an area over a distance squared, $dA\cos\alpha/s^2$, and it is the same for every closed surface round the charge.`},
      {text: raw`It depends on the shape: a lumpy surface fills more.`, misconception: 'bigger-surface',
        why: raw`A closed surface round the charge meets every direction out of it; where a fold makes a line cross three times, out, in and out, two of the crossings cancel. Every direction counts once, whatever the shape.`},
    ],
    explanation: raw`A closed surface round $q$ fills every direction from it exactly once: the whole solid angle, $4\pi$. So its flux is $\frac{q}{4\pi\varepsilon_0}\,(4\pi)=q/\varepsilon_0$, whatever its shape and wherever inside it the charge sits.`,
    review: {lesson: 'inside', stage: 'solve', case: 'off'}},

  {id: 'inside-why-zero', lesson: 'inside', kind: 'check',
    prompt: raw`With the point charge outside the sphere, why does the net flux through the sphere come to zero?`,
    choices: [
      {correct: true, text: raw`Every cone of directions from $q$ that meets the sphere crosses it twice, in and out, and the two crossings carry equal flux of opposite sign.`},
      {text: raw`The charge’s field does not reach the sphere.`, misconception: 'zero-flux-zero-field',
        why: raw`A point charge’s field reaches everywhere. It is strongest on the side of the sphere facing $q$, and it crosses every patch.`},
      {text: raw`Only the charge inside a surface makes a field on it.`, misconception: 'only-inside-field',
        why: raw`Every charge makes a field everywhere. The charge outside makes a field all over the sphere; its flux cancels, not its field.`},
    ],
    explanation: raw`On the side facing $q$ the line from $q$ runs against the outward normal, so those patches carry $-q\,d\Omega/(4\pi\varepsilon_0)$; on the far side the same cone carries $+q\,d\Omega/(4\pi\varepsilon_0)$. Cone by cone they cancel, and the flux is zero, for either sign of $q$.`,
    review: {lesson: 'inside', stage: 'left', case: 'outside'}},

  {id: 'inside-capacitor', lesson: 'inside', kind: 'transfer',
    prompt: raw`Stand a pillbox across one plate of a parallel-plate capacitor, that plate carrying $\sigma$ and the other $-\sigma$, with one face between the plates and one outside. What is the field’s part $E_\perp$ away from the first plate on each face?`,
    choices: [
      {correct: true, text: raw`$\sigma/\varepsilon_0$ on the face between the plates, and zero on the face outside: the other plate adds to the field, though not to the flux.`},
      {text: raw`$\sigma/(2\varepsilon_0)$ on both faces, the plate’s own field, since only the charge inside counts.`, misconception: 'only-inside-field',
        why: raw`Only the charge inside counts toward the flux, but the field is made by both plates. Between them their fields add; outside they cancel.`},
      {text: raw`Zero on both faces: the other plate’s field cancels the flux.`, misconception: 'outside-counts',
        why: raw`The other plate is outside the pillbox and adds nothing to its net flux, which stays $\sigma A/\varepsilon_0$. It does change the field, but not to zero between the plates.`},
    ],
    explanation: raw`Each plate alone makes $|\sigma|/(2\varepsilon_0)$ on both sides of it. Between the plates the two fields point the same way and add to $\sigma/\varepsilon_0$; outside they point opposite ways and cancel. The flux through the pillbox, $\sigma A/\varepsilon_0$, all goes through the inner face, as Gauss’s law with $Q_{\text{enc}}=\sigma A$ says.`,
    review: {lesson: 'inside', section: 'The field in the law is the whole field'}},

  {id: 'inside-rod-through', lesson: 'inside', kind: 'transfer',
    prompt: raw`A long straight rod with a uniform $\lambda$ passes right through a sphere, so a length $\ell$ of it lies inside and the rest pokes out at both ends. What is the flux out through the sphere?`,
    choices: [
      {correct: true, tex: raw`\frac{\lambda\ell}{\varepsilon_0}`},
      {text: raw`$\lambda L/\varepsilon_0$, with $L$ the rod’s whole length`, misconception: 'qenc-total',
        why: raw`Only the part of the rod inside the sphere is enclosed. The parts that poke out are charges outside, and add nothing to the flux.`},
      {text: raw`None can be found: Gauss’s law needs a surface that encloses all the charge.`, misconception: 'surface-real',
        why: raw`The law holds for any closed surface and any charge, cut through or not. Spread charge is many small charges, and only those inside count.`},
    ],
    explanation: raw`Charge spread along a line is many small charges $\lambda\,d\ell$. Each inside the sphere gives its own flux, each outside gives none, so the flux is the charge inside over $\varepsilon_0$: $\lambda\ell/\varepsilon_0$.`,
    review: {lesson: 'inside', section: 'Step four: many charges'}},

  {id: 'inside-dipole', lesson: 'inside', kind: 'predict',
    prompt: raw`A positive and a negative charge of the same size sit side by side inside a sphere. Which is right?`,
    choices: [
      {correct: true, text: raw`The flux through the sphere is zero, yet the field on it is not.`},
      {text: raw`The flux is zero, and so is the field on the sphere.`, misconception: 'zero-flux-zero-field',
        why: raw`The pair makes a field all over the sphere, leaving near the positive charge and entering near the negative one. Only the net flux is zero.`},
      {text: raw`The flux is not zero: each charge sends its own flux out through the sphere.`, misconception: 'sign',
        why: raw`Each does, with its own sign: $q/\varepsilon_0$ and $-q/\varepsilon_0$. Fluxes add like the charges, and these add to zero.`},
    ],
    explanation: raw`Fluxes add: the two charges inside give $q/\varepsilon_0$ and $-q/\varepsilon_0$, so the net flux is zero. Their field is not zero on the sphere: it crosses out on one side and in on the other in equal amounts.`,
    review: {lesson: 'inside', section: 'Check the answer', case: 'outside'}},

  {id: 'inside-shells-outside', lesson: 'inside', kind: 'check',
    prompt: raw`Inside a uniform ball, a Gaussian sphere of radius $r$ gives $E_r=kQ_{\text{enc}}/r^2$, as if the ball’s charge outside $r$ made no field there. Why is that right?`,
    choices: [
      {correct: true, text: raw`The charge outside $r$ is a set of uniform shells, and a uniform shell makes no field anywhere inside it.`},
      {text: raw`Gauss’s law ignores charge outside the surface: its field is never part of $\vec E$.`, misconception: 'only-inside-field',
        why: raw`The $\vec E$ in the law is the whole field. The outer charge drops out of it here only because its shells’ fields cancel inside them; a charge outside with no such symmetry would add to the field.`},
      {text: raw`It is only nearly right: the outer shells pull a little on a point off the centre.`, misconception: 'shell-inside',
        why: raw`A uniform shell’s field is exactly zero everywhere inside it, not only at its centre. The near part of the shell is closer, but there is less of it in each cone of directions.`},
    ],
    explanation: raw`The law always holds with the total field. It comes out as if only the inner charge mattered because the outer charge is arranged in shells, and each shell’s field is zero everywhere inside it. Where charge outside breaks the symmetry, the field on the surface is still the total one, and the answer would not be this simple.`,
    review: {lesson: 'inside', section: 'Why the symmetric problems work'}},

  {id: 'inside-carry-out', lesson: 'inside', kind: 'predict',
    prompt: raw`Carry a point charge slowly from inside a sphere, across the sphere, to outside it. What does the flux through the sphere do along the way?`,
    choices: [
      {correct: true, text: raw`It stays $q/\varepsilon_0$ until the charge crosses the surface, then it is zero.`},
      {text: raw`It falls smoothly as the charge nears the surface and moves out.`, misconception: 'bigger-surface',
        why: raw`While the charge is inside, the sphere surrounds it and fills every direction once, however near the surface it is. The flux does not change until it crosses.`},
      {text: raw`It stays $q/\varepsilon_0$ even outside, since the charge’s field still crosses the sphere.`, misconception: 'outside-counts',
        why: raw`Outside, the field still crosses the sphere, but in through the near side and out through the far side in equal amounts. The net flux is zero.`},
    ],
    explanation: raw`The flux counts only the charge inside. It is $q/\varepsilon_0$ for every position inside and zero for every position outside, and it jumps from one to the other only as the charge crosses the surface.`,
    review: {lesson: 'inside', section: 'Check the answer', case: 'outside'}},

  {id: 'inside-no-division', lesson: 'inside', kind: 'check',
    prompt: raw`With the charge off the centre, the flux through the sphere is still $q/\varepsilon_0$. Can you divide it by $4\pi r^2$ to get the field on the sphere?`,
    choices: [
      {correct: true, text: raw`No. The field differs from patch to patch and crosses each at its own angle, so it cannot come out of the integral.`},
      {text: raw`Yes: the field is $q/(4\pi\varepsilon_0r^2)$ on every patch, as it was with the charge at the centre.`, misconception: 'false-symmetry',
        why: raw`That needed the field perpendicular to the sphere and the same all over it, which only a charge at the centre gives. Off the centre it is stronger near the charge and slanted to most patches.`},
      {text: raw`Yes, but only on the patch nearest the charge.`, misconception: 'false-symmetry',
        why: raw`Dividing the total flux by the area gives an average of the field’s outward part, not its value on any one patch. The nearest patch sees more than that average.`},
    ],
    explanation: raw`The law still holds: the flux is $q/\varepsilon_0$. But the field is radial from the charge, not from the centre, so on the sphere it has a different size and a different angle on each patch. Without the symmetry, $E$ cannot be pulled out of $\oint\vec E\cdot d\vec A$.`,
    review: {lesson: 'inside', stage: 'symmetry', case: 'off'}},
];
