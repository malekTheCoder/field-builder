import type {Question} from '../types';
const raw = String.raw;

/* THE SEMI-INFINITE LINE, in its lesson's symbols (src/lessons/semi.ts): density λ on the y-axis from its end
 * at y = 0 up to +∞, P = (r, 0) level with the end, α the angle at P between the perpendicular to the line
 * and the line of sight to a piece, y = r tan α, rᵢ = r sec α, ΔQ = λ r sec²α Δα, so every piece makes
 * kλΔα/r. ΔE_x = ΔE cos α and ΔE_y = −ΔE sin α; for positive λ, E_x = kλ/r (out from the line) and
 * E_y = −kλ/r (back past the end), so the field leans at π/4. Every result and limit here is checked by number in
 * tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'semi-what-cancels', lesson: 'semi', kind: 'predict',
    prompt: raw`$P$ is a distance $r$ from the end of a line that runs on without end, level with that end, on the perpendicular through it. What cancels at $P$?`,
    choices: [
      {correct: true, text: raw`Nothing: the line starts level with $P$ and runs only one way, so no piece has a mirror to undo its part along the line.`},
      {text: raw`The parts along the line cancel, as on the infinite line.`, misconception: 'cancel-survivor',
        why: raw`On the infinite line each piece’s part along it was undone by a mirror piece on the other side of $P$. That half of the line is gone, so nothing undoes these parts, and they all point the same way.`},
      {text: raw`The near pieces’ parts along the line cancel the far pieces’.`, misconception: 'cancel-survivor',
        why: raw`Every piece lies on the same side of the perpendicular through $P$, so every part along the line points the same way: back past the end, for a positive charge. They add.`},
    ],
    explanation: raw`A part cancels only against a mirror piece. Every piece here is on one side of the perpendicular through $P$, so none has a partner: each keeps its part across the line, $\Delta E\cos\alpha$, and its part along it, $\Delta E\sin\alpha$, and the field leans.`,
    review: {lesson: 'semi', stage: 'cancel'}},

  {id: 'semi-direction', lesson: 'semi', kind: 'predict',
    prompt: raw`For a positive line, which way does the field at $P$ point?`,
    choices: [
      {correct: true, text: raw`Away from the line and back past its end, halfway between the two.`},
      {text: raw`Straight away from the line, perpendicular to it.`, misconception: 'half-of-symmetric',
        why: raw`That is the infinite line’s direction. It needed the missing half to cancel the parts along the line; without it those parts survive, and the field leans.`},
      {text: raw`Away from the line and forward, out over the line.`, misconception: 'sign',
        why: raw`For a positive charge each piece’s field points away from that piece. Every piece is up along $+y$ from the end, level with $P$, so away from it is back toward $-y$, past the end.`},
    ],
    explanation: raw`Each positive piece pushes $P$ along the line from the piece to $P$: out, away from the line, toward $+x$, and back toward $-y$. The two parts come to the same size, $k\lambda/r$, so the field points halfway between $+x$ and $-y$, at $\pi/4$; for a negative line it points exactly the opposite way.`,
    review: {lesson: 'semi', section: 'What the answer says'}},

  {id: 'semi-lean', lesson: 'semi', kind: 'predict',
    prompt: raw`How steeply does the field lean, compared with $\pi/4$ from the perpendicular?`,
    choices: [
      {correct: true, text: raw`Exactly $\pi/4$: cut at equal angles, every piece makes the same size of field, spread evenly over a quarter turn.`},
      {text: raw`Closer to the perpendicular: the near pieces are much closer to $P$, so they count most.`, misconception: 'jacobian',
        why: raw`The near pieces are closer, but the far pieces are longer and hold more charge. Cut at equal angles at $P$, the two exactly balance: every piece makes $k\lambda\,\Delta\alpha/r$.`},
      {text: raw`Closer to the line: the far pieces hold far more charge.`, misconception: 'fixed-distance',
        why: raw`The far pieces do hold more charge, but they are farther away too, $r_i=r\sec\alpha$. The $\sec^2\alpha$ in their charge cancels the one in $r_i^2$.`},
    ],
    explanation: raw`Each piece makes $k\lambda\,\Delta\alpha/r$, whatever its angle. Over the quarter turn from $\alpha=0$ to $\pi/2$, the parts across, $\int\cos\alpha\,d\alpha$, and the parts along, $\int\sin\alpha\,d\alpha$, both come to one: equal parts, so the lean is exactly $\pi/4$.`,
    review: {lesson: 'semi', stage: 'piece'}},

  {id: 'semi-dq', lesson: 'semi', kind: 'setup',
    prompt: raw`Cut the line at equal angles $\Delta\alpha$ seen from $P$. What charge does the piece at angle $\alpha$ hold?`,
    choices: [
      {correct: true, tex: raw`\Delta Q=\lambda r\sec^2\alpha\,\Delta\alpha`},
      {tex: raw`\Delta Q=\lambda\,\Delta\alpha`, misconception: 'piece-length',
        why: raw`$\lambda$ is a charge per unit length, and $\Delta\alpha$ is an angle. The piece’s charge is $\lambda$ times its length along the line.`},
      {tex: raw`\Delta Q=\lambda r\,\Delta\alpha`, misconception: 'jacobian',
        why: raw`$r\,\Delta\alpha$ is the length only of the piece right at the end, level with $P$. Farther out, the same angle takes in a longer stretch of line, longer by $\sec^2\alpha$.`},
      {tex: raw`\Delta Q=\lambda r\sec\alpha\,\Delta\alpha`, misconception: 'jacobian',
        why: raw`$r\sec\alpha\,\Delta\alpha$ is the width of the angle at the piece’s distance, square to the line of sight. The line crosses that line of sight on a slant, which makes the piece longer by one more $\sec\alpha$.`},
    ],
    explanation: raw`The piece sits at $y=r\tan\alpha$, so a step $\Delta\alpha$ moves along the line by $r\sec^2\alpha\,\Delta\alpha$. It holds $\lambda$ times that. With $r_i^2=r^2\sec^2\alpha$, the secants cancel and every piece makes $k\lambda\,\Delta\alpha/r$.`,
    review: {lesson: 'semi', stage: 'cut'}},

  {id: 'semi-components', lesson: 'semi', kind: 'setup',
    prompt: raw`With $\alpha$ measured at $P$ from the perpendicular across to the end, what are one piece’s two parts?`,
    choices: [
      {correct: true, tex: raw`\Delta E_x=\Delta E\cos\alpha,\quad\Delta E_y=-\Delta E\sin\alpha`},
      {tex: raw`\Delta E_x=\Delta E\sin\alpha,\quad\Delta E_y=-\Delta E\cos\alpha`, misconception: 'wrong-part',
        why: raw`$\alpha$ is measured from the perpendicular, so the part across the line, along $x$, is adjacent to it and takes $\cos\alpha$. The part along the line is opposite it, $\sin\alpha$.`},
      {tex: raw`\Delta E_x=\Delta E\cos\alpha,\quad\Delta E_y=\Delta E\sin\alpha`, misconception: 'sign',
        why: raw`That drops the minus. Every piece is at positive $y$, so for a positive charge its field at $P$ points back toward $-y$. $\Delta E$ carries the charge’s sign; the minus comes from where the piece is.`},
      {tex: raw`\Delta E_x=\Delta E\cos\alpha,\quad\Delta E_y=0`, misconception: 'cancel-survivor',
        why: raw`A piece’s part along the line is not zero; on the infinite line it was only cancelled by a mirror piece. Here there is none, so it stays.`},
    ],
    explanation: raw`The line of sight from $P$ to a piece makes the angle $\alpha$ with the perpendicular, so the part across the line is $\Delta E\cos\alpha$, along $+x$, and the part along it is $\Delta E\sin\alpha$, pointing back past the end, along $-y$, for a positive charge.`,
    review: {lesson: 'semi', stage: 'cancel'}},

  {id: 'semi-bounds', lesson: 'semi', kind: 'setup',
    prompt: raw`In the angle $\alpha$ at $P$, what are the bounds that cover the whole line?`,
    choices: [
      {correct: true, tex: raw`\int_{0}^{\pi/2}\cdots\,d\alpha`},
      {tex: raw`\int_{-\pi/2}^{\pi/2}\cdots\,d\alpha`, misconception: 'bounds',
        why: raw`That is the infinite line, running both ways from the point nearest $P$. This line starts level with $P$, at $\alpha=0$.`},
      {tex: raw`\int_{0}^{\infty}\cdots\,d\alpha`, misconception: 'bounds',
        why: raw`Those are the bounds in $y$. In the angle, the line’s far end is at $\alpha=\pi/2$, where $\tan\alpha$ runs off to infinity.`},
      {tex: raw`\int_{0}^{\pi}\cdots\,d\alpha`, misconception: 'bounds',
        why: raw`That is half a turn round $P$. Seen from $P$, this line fills a quarter turn: from straight across to the end, up to the horizon along it.`},
    ],
    explanation: raw`With $y=r\tan\alpha$, the end is at $\alpha=0$ and the far reaches of the line at $\alpha=\pi/2$. An endless line becomes a quarter turn, which is why the angle was chosen.`,
    review: {lesson: 'semi', stage: 'shrink'}},

  {id: 'semi-equal', lesson: 'semi', kind: 'check',
    prompt: raw`The page finds $E_y=-k\lambda/r$, the part along the line. Without a second integral, what is $E_x$, the part across it?`,
    choices: [
      {correct: true, tex: raw`E_x=\frac{k\lambda}{r}`},
      {tex: raw`E_x=\frac{2k\lambda}{r}`, misconception: 'half-of-symmetric',
        why: raw`That is the whole infinite line’s part across it. Half the line gives half of that part: the missing half supplied the other share.`},
      {tex: raw`E_x=-\frac{k\lambda}{r}`, misconception: 'sign',
        why: raw`Every piece is on the line, to the left of $P$, so for a positive charge its field points out, along $+x$. $E_x$ has the sign of $\lambda$.`},
      {tex: raw`E_x=0`, misconception: 'cancel-survivor',
        why: raw`The parts across the line never cancel: every piece is on the same side of $P$, and all those parts point the same way, away from the line for a positive charge.`},
    ],
    explanation: raw`Every piece makes $k\lambda\,d\alpha/r$. Over the quarter turn, $\int_0^{\pi/2}\sin\alpha\,d\alpha$ and $\int_0^{\pi/2}\cos\alpha\,d\alpha$ are both one, since the sine takes the cosine’s values in reverse order. So $E_x$ is the same size as $E_y$, pointing away from the line: $k\lambda/r$.`,
    review: {lesson: 'semi', stage: 'shrink'}},

  {id: 'semi-double-r', lesson: 'semi', kind: 'check',
    prompt: raw`Move $P$ twice as far from the end, along the same perpendicular. What happens to the field?`,
    choices: [
      {correct: true, text: raw`Both parts halve, and it keeps its lean at $\pi/4$.`},
      {text: raw`Both parts fall to a quarter, as a point charge’s field does.`, misconception: 'line-falloff',
        why: raw`An endless line is not a point charge. Twice as far away, the stretch of line inside any fixed angle at $P$ is twice as long, so each part falls only as $1/r$.`},
      {text: raw`It weakens, and turns toward the perpendicular, since the end matters less from far away.`, misconception: 'line-falloff',
        why: raw`From any distance the line fills the same quarter turn at $P$, so the picture only rescales. Both parts fall as $1/r$ together, and the field never turns.`},
    ],
    explanation: raw`$E_x=k\lambda/r$ and $E_y=-k\lambda/r$ both fall as $1/r$: doubling $r$ halves each. They stay equal in size, so moving $P$ away weakens the field but never turns it.`,
    review: {lesson: 'semi', section: 'Limiting cases'}},

  {id: 'semi-add-mirror', lesson: 'semi', kind: 'transfer',
    prompt: raw`Add the mirror half, from the end down to $-\infty$, with the same $\lambda$. What is the field at $P$ now?`,
    choices: [
      {correct: true, text: raw`$2k\lambda/r$ along $x$, perpendicular to the line: the parts along it cancel, the parts across add.`},
      {text: raw`$2\sqrt2\,k\lambda/r$, still leaning at $\pi/4$: twice the half line’s field.`, misconception: 'missed-cancel',
        why: raw`The new half is the old half’s mirror: its part along the line points the other way, toward $+y$, and cancels the old half’s. Only the parts across the line add.`},
      {text: raw`Zero: the two halves cancel each other.`, misconception: 'cancel-survivor',
        why: raw`Only the parts along the line are equal and opposite. The parts across it point the same way for both halves, away from the line for a positive charge, and add.`},
    ],
    explanation: raw`The mirror half gives $+k\lambda/r$ along $y$, cancelling this half’s $-k\lambda/r$, and another $k\lambda/r$ across the line. The total is $2k\lambda/r$ along $x$, perpendicular to the line: the infinite line. The lean was the missing half.`,
    review: {lesson: 'semi', section: 'What the answer says'}},

  {id: 'semi-negative', lesson: 'semi', kind: 'transfer',
    prompt: raw`Give the line a negative density $\lambda$. Which way does the field at $P$ point?`,
    choices: [
      {correct: true, text: raw`Toward the line and forward, up along it, still at $\pi/4$.`},
      {text: raw`Straight toward the line.`, misconception: 'cancel-survivor',
        why: raw`The sign turns the arrows round but does not give the pieces partners. The parts along the line still survive, now pointing up along it, toward $+y$.`},
      {text: raw`Away from the line and back past the end, as before.`, misconception: 'sign',
        why: raw`That is a positive line’s field. With $\lambda$ negative each piece’s field points from $P$ toward the piece: across toward the line and up along $+y$.`},
    ],
    explanation: raw`Every piece’s field now points from $P$ toward the piece, so both parts reverse: $E_x=-k|\lambda|/r$ and $E_y=+k|\lambda|/r$. They are still equal in size, so the field still leans at $\pi/4$, exactly opposite to a positive line’s.`,
    review: {lesson: 'semi', section: 'What the answer says'}},
];
