import type {Question} from '../types';
const raw = String.raw;

/* THE ROD SEEN END-ON, in its lesson's symbols (src/lessons/axial.ts): a rod of length L and charge Q on the
 * x-axis from x = 0 to x = L, λ = Q/L, P on the same axis at x = L + a, a piece at x holding ΔQ = λΔx,
 * rᵢ = L + a − x. Every arrow lies along the axis: no angle, no projection, nothing to cancel, which is what
 * these questions keep returning to. Every result and limit here is checked by number in
 * tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'axial-what-cancels', lesson: 'axial', kind: 'predict',
    prompt: raw`$P$ is on the rod’s own line, a distance $a$ beyond its end. What cancels at $P$?`,
    choices: [
      {correct: true, text: raw`Nothing, and nothing needs to: every piece’s arrow lies along the axis, and they all point the same way.`},
      {text: raw`The parts across the axis cancel in mirror pairs, leaving the parts along it.`, misconception: 'collinear',
        why: raw`There are no parts across the axis to cancel. Each piece sits on the same line as $P$, so its arrow already points along that line, with no pairing needed.`},
      {text: raw`The arrows of the near half of the rod cancel those of the far half.`, misconception: 'cancel-survivor',
        why: raw`Every piece is on the same side of $P$, so every arrow points the same way: away from the rod for a positive charge, toward it for a negative one. They all add.`},
      {text: raw`Nothing cancels, so a part across the axis survives and the field leans.`, misconception: 'collinear',
        why: raw`Nothing cancels, but nothing leans either. A piece on $P$’s own line makes a field along that line; there is no part across the axis to survive.`},
    ],
    explanation: raw`The piece at $x$ and $P$ lie on one line, so the piece’s field at $P$ lies along that line too. There is no angle, no projection factor and no partner to find: $E_y=0$ with no pairing at all, and $E_x$ is the plain sum of every piece’s field.`,
    review: {lesson: 'axial', stage: 'cancel'}},

  {id: 'axial-distance', lesson: 'axial', kind: 'setup',
    prompt: raw`The rod runs from $x=0$ to $x=L$ and $P$ is at $x=L+a$. How far from $P$ is the piece at $x$?`,
    choices: [
      {correct: true, tex: raw`r_i=L+a-x`},
      {tex: raw`r_i=a`, misconception: 'fixed-distance',
        why: raw`$a$ is the gap from the rod’s near end only. Every other piece is farther away, up to $L+a$ for the piece at the far end.`},
      {tex: raw`r_i=a+x`, misconception: 'fixed-distance',
        why: raw`That counts along the rod the wrong way: it puts the piece right next to $P$, at $x=L$, a distance $L+a$ away. Subtract the positions: $P$ at $L+a$ less the piece at $x$.`},
      {tex: raw`r_i=\sqrt{x^2+a^2}`, misconception: 'collinear',
        why: raw`A hypotenuse needs a right angle, and there is none: the piece and $P$ lie on one line, so the distance is a difference of positions.`},
    ],
    explanation: raw`The piece and $P$ share the $x$-axis, so the distance between them is the difference of their positions, $r_i=L+a-x$. It runs from $L+a$ for the piece at the far end down to $a$ for the piece at the near end.`,
    review: {lesson: 'axial', stage: 'piece'}},

  {id: 'axial-integral', lesson: 'axial', kind: 'setup',
    prompt: raw`Which integral is the field at $P$?`,
    choices: [
      {correct: true, tex: raw`E_x=\int_0^L\frac{k\lambda\,dx}{(L+a-x)^2}`},
      {tex: raw`E_x=\int_0^L\frac{k\lambda\,dx}{L+a-x}`, misconception: 'potential-power',
        why: raw`That falls as $1/r_i$: it is the potential’s integrand. A piece’s field falls as the inverse square of its distance.`},
      {tex: raw`E_x=\int_0^L\frac{kQ\,dx}{(L+a-x)^2}`, misconception: 'whole-charge',
        why: raw`That puts the whole rod’s charge in every piece. A piece of length $dx$ holds only $\lambda\,dx$, and the integral adds those shares back up to $Q$.`},
      {tex: raw`E_x=\int_{-L/2}^{L/2}\frac{k\lambda\,dx}{(L+a-x)^2}`, misconception: 'bounds',
        why: raw`Those are the ends of a rod centred on the origin. This one runs from $x=0$ to $x=L$, and its distance $L+a-x$ is written for those ends.`},
    ],
    explanation: raw`Each piece holds $\lambda\,dx$ and is $L+a-x$ from $P$, and its whole field lies along the axis, so nothing is projected. Adding every piece from $x=0$ to $x=L$ gives $E_x=k\lambda\bigl(1/a-1/(L+a)\bigr)$, which is $kQ/\bigl(a(L+a)\bigr)$.`,
    review: {lesson: 'axial', stage: 'shrink'}},

  {id: 'axial-far', lesson: 'axial', kind: 'check',
    prompt: raw`$E_x=\dfrac{kQ}{a(L+a)}$. Move $P$ far out along the axis, $a\gg L$. Which expression does $E_x$ approach?`,
    choices: [
      {correct: true, tex: raw`\frac{kQ}{(a+L/2)^2}`},
      {tex: raw`\frac{k\lambda}{a}`, misconception: 'far-limit',
        why: raw`That is the other end of the story: $P$ right beside the end, $a\ll L$, where the rod looks endless. Far away it looks like a point.`},
      {tex: raw`\frac{kQ}{a+L/2}`, misconception: 'potential-power',
        why: raw`That falls as one power of the distance, as a point charge’s potential does. A finite charge’s field, seen from far away, falls as the inverse square.`},
      {tex: raw`0`, misconception: 'cancel-survivor',
        why: raw`Far away the field gets weak, but nothing cancels it: every piece’s field still points the same way along the axis. It shrinks as the inverse square, like any finite charge’s.`},
    ],
    explanation: raw`$a(L+a)$ is $(a+L/2)^2-(L/2)^2$, and when $a\gg L$ the last term hardly matters, so $E_x$ tends to $kQ/(a+L/2)^2$: from far off the rod is a point charge at its centre.`,
    review: {lesson: 'axial', section: 'Limiting cases'}},

  {id: 'axial-near', lesson: 'axial', kind: 'check',
    prompt: raw`Now bring $P$ in until it is up against the end, $a\ll L$. How does the size of $E_x$ grow?`,
    choices: [
      {correct: true, text: raw`As $1/a$: up close the rod looks like a line that never stops, and $E_x$ tends to $k\lambda/a$.`},
      {text: raw`As $1/a^2$: it tends to $kQ/a^2$, the whole charge at the end.`, misconception: 'point-up-close',
        why: raw`Only a little of the charge is near the end; most of it is much farther from $P$. The near pieces dominate, and they make the field of a line, not of a point holding all of $Q$.`},
      {text: raw`As $\ln(L/a)$, slowly.`, misconception: 'potential-power',
        why: raw`That is how the potential grows beyond the end of a rod. The field falls one power of the distance faster than the potential, so it grows faster up close: as $1/a$.`},
    ],
    explanation: raw`In $E_x=k\lambda\bigl(1/a-1/(L+a)\bigr)$ the far end’s term stays finite while the near end’s, $k\lambda/a$, grows without bound. That is the field of a half line on its own axis: it grows as $1/a$, not as a point charge’s $1/a^2$, because the charge is spread along the line.`,
    review: {lesson: 'axial', section: 'Limiting cases'}},

  {id: 'axial-near-pieces', lesson: 'axial', kind: 'predict',
    prompt: raw`Every piece of the rod holds the same charge. Which pieces add the most to the field at $P$?`,
    choices: [
      {correct: true, text: raw`The ones nearest $P$: each piece’s field falls as the inverse square of its distance.`},
      {text: raw`All add the same, since they hold the same charge.`, misconception: 'fixed-distance',
        why: raw`They hold the same charge, but they are not the same distance from $P$. The piece at the near end is $a$ away and the one at the far end $L+a$.`},
      {text: raw`None: the near pieces’ fields are cancelled by the far ones’.`, misconception: 'cancel-survivor',
        why: raw`Every piece lies on the same side of $P$, so every field points the same way along the axis. Nothing cancels; they all add.`},
    ],
    explanation: raw`The piece at $x$ adds $k\lambda\,dx/(L+a-x)^2$. The nearest is $a$ from $P$ and the farthest $L+a$, so a near piece counts for $(L+a)^2/a^2$ times as much as a far one.`,
    review: {lesson: 'axial', stage: 'piece'}},

  {id: 'axial-negative', lesson: 'axial', kind: 'predict',
    prompt: raw`Give the rod a negative charge. Which way does the field at $P$ point?`,
    choices: [
      {correct: true, text: raw`Along the axis, toward the rod.`},
      {text: raw`Along the axis, away from the rod.`, misconception: 'sign',
        why: raw`That is the field of a positive rod. A negative charge turns every piece’s arrow round, so they all point toward the rod, and so does their sum.`},
      {text: raw`Toward the rod, but leaning off the axis.`, misconception: 'collinear',
        why: raw`Every piece is on $P$’s own line, whatever its sign, so every arrow lies along that line. The sign turns the arrows round; it cannot tip them off the axis.`},
    ],
    explanation: raw`Each piece’s field now points from $P$ toward the piece, along the axis. They all point the same way, so they add to a field along the axis toward the rod: $E_x=kQ/\bigl(a(L+a)\bigr)$ has the sign of $Q$.`,
    review: {lesson: 'axial', section: 'What the answer says'}},

  {id: 'axial-off-axis', lesson: 'axial', kind: 'transfer',
    prompt: raw`Move $P$ a little off the axis, sideways, still beyond the end. What happens to the part of the field across the axis?`,
    choices: [
      {correct: true, text: raw`It appears, and nothing cancels it: every piece lies on the axis, on the same side of $P$.`},
      {text: raw`It stays zero: a rod has no parts across its own line.`, misconception: 'collinear',
        why: raw`That was true only while $P$ was on the rod’s line. Off it, each piece’s line of sight to $P$ is at an angle to the axis, so each arrow has a part across it.`},
      {text: raw`It appears in each piece, but mirror pieces cancel it.`, misconception: 'cancel-survivor',
        why: raw`Every piece lies on the axis, all on one side of $P$’s new position. Their parts across the axis all point the same way, away from the rod for a positive charge, and nothing is there to undo them.`},
    ],
    explanation: raw`Off the axis, the piece at $x$ sees $P$ along a slanted line, so its field has a part across the axis. Every piece is on the same side of $P$, so those parts all point the same way: away from the rod’s line for a positive charge, toward it for a negative one. They add.`,
    review: {lesson: 'axial', stage: 'cancel'}},

  {id: 'axial-centre-origin', lesson: 'axial', kind: 'transfer',
    prompt: raw`Put the origin at the rod’s centre instead, so the rod runs from $-L/2$ to $L/2$ and $P$ is at $x=L/2+a$. Which integral is the field now?`,
    choices: [
      {correct: true, tex: raw`\int_{-L/2}^{L/2}\frac{k\lambda\,dx}{(L/2+a-x)^2}`},
      {tex: raw`\int_{-L/2}^{L/2}\frac{k\lambda\,dx}{(L+a-x)^2}`, misconception: 'fixed-distance',
        why: raw`$L+a-x$ was the distance with $P$ at $L+a$. With the origin moved, $P$ is at $L/2+a$, and the piece at $x$ is $L/2+a-x$ from it.`},
      {tex: raw`\int_{0}^{L}\frac{k\lambda\,dx}{(L/2+a-x)^2}`, misconception: 'bounds',
        why: raw`With the origin at the centre the rod no longer runs from $0$ to $L$. The bounds are where the charge is, in the new coordinates: $-L/2$ to $L/2$.`},
    ],
    explanation: raw`Moving the origin changes how positions are written, not the physics. Each piece is still the difference of positions from $P$, now $L/2+a-x$, and the rod runs from $-L/2$ to $L/2$. The integral gives the same $kQ/\bigl(a(L+a)\bigr)$.`,
    review: {lesson: 'axial', stage: 'shrink'}},
];
