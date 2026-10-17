import type {Question} from '../types';
const raw = String.raw;

/* THE ARC'S POTENTIAL, AT ITS CENTRE, in its lesson's symbols (src/lessons/v-arc.ts): radius R, opening φ
 * (\varphi), θ from −φ/2 to φ/2, P at the centre, Q held fixed as φ changes so λ = Q/(Rφ), ΔQ = λRΔθ, ΔV = kΔQ/R,
 * V = kλφ = kQ/R whatever φ. It cannot be differentiated back: V is known at one point only. Every result here is
 * checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'v-arc-open', lesson: 'v-arc', kind: 'predict',
    prompt: raw`Hold $Q$ fixed and open a short arc, step by step, until it closes into a ring. What does $V$ at $P$ do?`,
    choices: [
      {correct: true, text: raw`It stays $kQ/R$ the whole way.`},
      {text: raw`It falls as the field does, to zero when the circle closes.`, misconception: 'arc-opening',
        why: raw`The field falls because its pieces’ arrows fan out and cancel. $V$ has no arrows: every piece stays $R$ from $P$, so all of the charge still adds up to $kQ/R$.`},
      {text: raw`It grows, since more of the arc comes round $P$.`, misconception: 'arc-held-fixed',
        why: raw`With $Q$ fixed, opening the arc spreads the same charge round more of the circle; it adds none. $|V|$ would grow only with $\lambda$ held fixed, when opening the arc adds charge.`},
    ],
    explanation: raw`Opening the arc moves its charge round the circle, but never nearer to $P$ or farther: every piece is $R$ away. So the pieces’ numbers add to $kQ/R$ at every opening, for a short arc, a semicircle and a closed ring alike.`,
    review: {lesson: 'v-arc', section: 'What the answer says'}},

  {id: 'v-arc-any-size', lesson: 'v-arc', kind: 'predict',
    prompt: raw`For the arc’s field the pieces had to be short. Must they be short for its potential?`,
    choices: [
      {correct: true, text: raw`No: every bit of a piece is $R$ from $P$, and a potential has no direction, so a piece of any size adds exactly $k\,\Delta Q/R$.`},
      {text: raw`Yes: the bits’ directions turn along a piece, just as they did for the field.`, misconception: 'potential-arrow',
        why: raw`Direction mattered for the field because its arrows partly cancel. A potential is a number: each bit adds $k\,dQ/R$, whatever its direction from $P$.`},
      {text: raw`Yes: the bits at a piece’s ends are farther from $P$ than its middle.`, misconception: 'fixed-distance',
        why: raw`Every bit of the arc is exactly $R$ from its centre, the ends of a piece as much as its middle.`},
    ],
    explanation: raw`The field needed short pieces because the direction of a bit’s field turns along a piece. The potential has no direction, and every bit is $R$ from $P$, so a piece adds exactly $k\,\Delta Q/R$ however long it is, and the sum is exact at any cut.`,
    review: {lesson: 'v-arc', stage: 'cut'}},

  {id: 'v-arc-dv', lesson: 'v-arc', kind: 'setup',
    prompt: raw`A piece $\Delta\theta$ wide holds $\Delta Q=\lambda R\,\Delta\theta$. What does it add to $V$ at $P$?`,
    choices: [
      {correct: true, tex: raw`\Delta V=k\lambda\,\Delta\theta`},
      {tex: raw`\Delta V=\frac{k\lambda\,\Delta\theta}{R}`, misconception: 'potential-power',
        why: raw`That uses the field’s inverse-square rule, $k\,\Delta Q/R^2$. A potential falls as $1/R$, so the one $R$ below cancels the $R$ in $\Delta Q$ and none is left.`},
      {tex: raw`\Delta V=-k\lambda\cos\theta\,\Delta\theta`, misconception: 'potential-arrow',
        why: raw`That projects onto $x$, as the field’s integrand did. A potential has no direction, so there is no $\cos\theta$ and no minus from the geometry.`},
      {tex: raw`\Delta V=\frac{kQ}{R}\,\Delta\theta`, misconception: 'whole-charge',
        why: raw`That gives each piece the whole arc’s charge. A piece holds only its own share, $\lambda R\,\Delta\theta$.`},
    ],
    explanation: raw`Every piece is $R$ from $P$, so it adds $k\,\Delta Q/R=k\lambda R\,\Delta\theta/R=k\lambda\,\Delta\theta$, a number with the sign of its charge, the same at every $\theta$.`,
    review: {lesson: 'v-arc', stage: 'piece'}},

  {id: 'v-arc-result', lesson: 'v-arc', kind: 'setup',
    prompt: raw`Add up the pieces from $\theta=-\varphi/2$ to $\varphi/2$. What is $V$ at $P$?`,
    choices: [
      {correct: true, tex: raw`V=k\lambda\varphi=\frac{kQ}{R}`},
      {tex: raw`V=\frac{2k\lambda}{R}\sin\frac{\varphi}{2}`, misconception: 'arc-opening',
        why: raw`That uses the arc field’s sine factor, which depends on $\varphi$ because the pieces’ arrows turn. The potential adds numbers with no direction, so no sine comes into it.`},
      {tex: raw`V=\frac{kQ}{R^2}`, misconception: 'potential-power',
        why: raw`That has the inverse square of a field. Each piece adds $k\,\Delta Q/R$, so all of them add $kQ/R$.`},
      {tex: raw`V=0`, misconception: 'potential-arrow',
        why: raw`A piece and its mirror cancel parts of each other’s fields, but their potentials are numbers of one sign here, and they add.`},
    ],
    explanation: raw`Each piece adds $k\lambda\,\Delta\theta$, the same everywhere on the arc, so the sum over the arc’s whole angle is $k\lambda\varphi$. With $Q=\lambda R\varphi$ that is $kQ/R$: all of the charge, all of it $R$ away.`,
    review: {lesson: 'v-arc', stage: 'add'}},

  {id: 'v-arc-full', lesson: 'v-arc', kind: 'check',
    prompt: raw`Close the arc into a ring. The field at its centre is zero. What is $V$ there?`,
    choices: [
      {correct: true, tex: raw`V=\frac{kQ}{R}`},
      {tex: raw`V=0`, misconception: 'potential-zero-field',
        why: raw`A zero field means $V$ is level at the centre, not zero. Every piece is still $R$ away and adds $k\,\Delta Q/R$ with the sign of its charge.`},
      {tex: raw`V=\frac{kQ}{R^2}`, misconception: 'potential-power',
        why: raw`That has the inverse square of a field. A potential falls as $1/R$.`},
    ],
    explanation: raw`A closed ring is the arc at $\varphi=2\pi$, and $V=kQ/R$ at every $\varphi$. The field is zero because the pieces’ arrows cancel in pairs straight across; that makes $V$ level at the centre, not zero.`,
    review: {lesson: 'v-arc', section: 'What the answer says'}},

  {id: 'v-arc-compare', lesson: 'v-arc', kind: 'check',
    prompt: raw`Put the same charge $Q$ on a semicircle and on a closed ring, both of radius $R$. Compare $V$ at their centres.`,
    choices: [
      {correct: true, text: raw`The same: $kQ/R$ for both.`},
      {text: raw`The semicircle’s is larger in size, since its field is larger.`, misconception: 'field-for-potential',
        why: raw`The semicircle’s field is larger because the ring’s arrows cancel. A potential has nothing to cancel: both put all of $Q$ at the distance $R$.`},
      {text: raw`The ring’s is zero, since its field is.`, misconception: 'potential-zero-field',
        why: raw`A zero field means $V$ is level there, not zero. Every piece of the ring is $R$ away and adds to $V$ with the sign of its charge.`},
      {text: raw`The ring’s is twice the semicircle’s, since it has twice the arc.`, misconception: 'arc-held-fixed',
        why: raw`It has twice the arc but the same charge, spread half as densely. $V$ counts the charge and its distance, and both are the same.`},
    ],
    explanation: raw`Every piece of either is $R$ from the centre, and the charges add to $Q$, so both give $kQ/R$. Their fields differ, $-2kQ/(\pi R^2)$ along $x$ for the semicircle and zero for the ring, because fields are arrows and the ring’s cancel.`,
    review: {lesson: 'v-arc', section: 'What the answer says'}},

  {id: 'v-arc-fixed-density', lesson: 'v-arc', kind: 'transfer',
    prompt: raw`Now hold $\lambda$ fixed instead of $Q$, and open the arc. What does $V$ at $P$ do?`,
    choices: [
      {correct: true, text: raw`Its size grows, as $V=k\lambda\varphi$: opening the arc now adds charge.`},
      {text: raw`It stays the same: $V$ never depends on the opening.`, misconception: 'arc-held-fixed',
        why: raw`$V=kQ/R$ is the same at every opening only while $Q$ is. With $\lambda$ fixed, $|Q|=|\lambda|R\varphi$ grows with the arc, and $|V|$ with it.`},
      {text: raw`It falls, as the field does once the arc is past a semicircle.`, misconception: 'arc-opening',
        why: raw`At fixed $\lambda$ the field magnitude does fall past a semicircle, because its arrows turn back. $V$ has no arrows: every added piece is $R$ away and adds $k\lambda\,\Delta\theta$ with the charge’s sign.`},
    ],
    explanation: raw`With $\lambda$ fixed, $V=k\lambda\varphi$ grows in size in proportion to $\varphi$: every piece added is $R$ from $P$ and adds $k\lambda\,\Delta\theta$. What is held fixed decides the story; with $Q$ fixed, the same sum is $kQ/R$ at every opening.`,
    review: {lesson: 'v-arc', section: 'What the answer says'}},

  {id: 'v-arc-no-gradient', lesson: 'v-arc', kind: 'transfer',
    prompt: raw`On a ring’s axis the field came from $E_z=-dV/dz$. Can the field at the arc’s centre be found from $V=kQ/R$ the same way?`,
    choices: [
      {correct: true, text: raw`No: $V$ is known only at the one point $P$, and a field is how $V$ changes from point to point.`},
      {text: raw`Yes: $E=-dV/dR=kQ/R^2$.`, misconception: 'gradient',
        why: raw`Changing $R$ does not move $P$: it changes the arc. A derivative that gives the field must move $P$ past a fixed charge, and $V$ is known only at the centre.`},
      {text: raw`Yes: $E=-dV/d\varphi=0$, so the field at the centre is zero.`, misconception: 'gradient',
        why: raw`$\varphi$ is the arc’s opening, not a position of $P$. The field at the centre is zero only for a closed ring; for any shorter arc its size is $2k|Q|\sin(\varphi/2)/(R^2\varphi)$.`},
    ],
    explanation: raw`$-dV/dz$ worked on the ring’s axis because $V$ was known all along the axis, as a function of where $P$ is. Here $V$ is known at the centre only. $R$ and $\varphi$ describe the arc, not where $P$ is, so differentiating with respect to them compares different arcs, not nearby points.`,
    review: {lesson: 'v-arc', section: 'What the answer says'}},

  {id: 'v-arc-negative', lesson: 'v-arc', kind: 'transfer',
    prompt: raw`Give the arc a negative charge. What is $V$ at $P$?`,
    choices: [
      {correct: true, text: raw`$kQ/R$, which is negative: $V$ has the sign of $Q$.`},
      {text: raw`Positive, the same size: a potential has no direction, so it has no sign.`, misconception: 'sign',
        why: raw`No direction does not mean no sign. Each piece adds $k\,\Delta Q/R$, negative for a negative charge.`},
      {text: raw`Negative, and pointing toward the middle of the arc.`, misconception: 'potential-arrow',
        why: raw`A potential does not point anywhere: it is a number. For an arc short of a full circle, it is the field that points toward its negatively charged middle.`},
    ],
    explanation: raw`Each piece adds $k\,\Delta Q/R$, with the sign of its charge, so with $Q$ negative the sum $kQ/R$ is negative. It points nowhere: the field points toward the middle of a negative arc short of a full circle, while a full circle has zero field.`,
    review: {lesson: 'v-arc', section: 'One piece'}},
];
