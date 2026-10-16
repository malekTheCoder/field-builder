import type {Question} from '../types';
const raw = String.raw;

/* CONDUCTORS, in its lesson's symbols (src/gauss/lessons/conductors.ts): a solid metal ball of radius R carrying a net
 * Q, the face of a large metal plate carrying σ on that face, and a neutral metal ball of radius b with a round hollow
 * of radius a at its centre, a point charge q at the hollow's centre. In metal at rest E = 0; a surface in the metal
 * encloses no charge; just outside, E_⊥ = σ/ε₀. E_r and E_⊥ are signed. Every result here is checked by number in
 * tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'conductors-why-zero', lesson: 'conductors', kind: 'predict',
    prompt: raw`Why is there no field inside the metal of a conductor once nothing in it moves?`,
    choices: [
      {correct: true, text: raw`A field there would set the metal’s free charges moving. Once they stop, they have arranged themselves so that their field cancels every other field in the metal.`},
      {text: raw`Gauss’s law proves it: a surface inside the metal encloses no charge.`, misconception: 'conductor-field',
        why: raw`That runs the argument backwards. That no field is in the metal is a fact about metal at rest; Gauss’s law then turns it into no charge inside.`},
      {text: raw`There is a field in the metal, only a weak one, since the metal shields it.`, misconception: 'conductor-field',
        why: raw`However weak, a field would keep the free charges moving. At rest, the field in the metal is exactly zero.`},
    ],
    explanation: raw`A conductor is full of charges free to move, and they keep moving until the field they make cancels whatever moved them. At rest, the field everywhere in the metal is zero. Gauss’s law takes it from there: a surface in the metal has no flux, so it encloses no charge.`,
    review: {lesson: 'conductors', section: 'Why the metal has no field'}},

  {id: 'conductors-where', lesson: 'conductors', kind: 'predict',
    prompt: raw`A solid metal ball carries a net charge $Q$, and nothing in it moves. Where is $Q$?`,
    choices: [
      {correct: true, text: raw`All on the ball’s surface, spread evenly over it when the ball is on its own.`},
      {text: raw`Spread evenly through the ball’s volume, as in a uniformly charged ball.`, misconception: 'conductor-field',
        why: raw`A sphere drawn anywhere in the metal sees no field, so its flux is zero and it encloses no charge. However close to the surface it goes, none of $Q$ is inside it.`},
      {text: raw`Bunched at the centre, as far as possible from the surface.`, misconception: 'conductor-field',
        why: raw`A small sphere round the centre, in the metal, has no flux, so no charge sits there. Like charges repel one another, and the farthest they can get from each other is the surface.`},
    ],
    explanation: raw`A sphere in the metal has zero flux, since the field is zero on every patch of it, so it encloses no charge, wherever it is drawn. All of $Q$ sits on the surface, evenly, since the ball is round.`,
    review: {lesson: 'conductors', stage: 'right', case: 'ball'}},

  {id: 'conductors-ball-inside', lesson: 'conductors', kind: 'setup',
    prompt: raw`Inside the metal ball, at $r<R$, what is $E_r$?`,
    choices: [
      {correct: true, tex: raw`0`},
      {tex: raw`\frac{kQr}{R^3}`, misconception: 'conductor-field',
        why: raw`That is a uniformly charged insulating ball’s field. In metal the charge has moved to the surface, and the field inside the metal is zero.`},
      {tex: raw`\frac{kQ}{r^2}`, misconception: 'qenc-total',
        why: raw`That counts all of $Q$ inside a sphere of radius $r<R$. The charge is on the surface, outside that sphere, so the sphere encloses none of it.`},
    ],
    explanation: raw`A sphere of radius $r<R$ lies in the metal, encloses none of the charge, and has $E_r=0$ on every patch. Outside, it holds all of $Q$, and $E_r=Q/(4\pi\varepsilon_0r^2)$: the same field as a thin shell carrying $Q$.`,
    review: {lesson: 'conductors', stage: 'solve', case: 'ball'}},

  {id: 'conductors-face-left', lesson: 'conductors', kind: 'setup',
    prompt: raw`A small pillbox stands across the conductor’s surface, one face of area $A$ outside and one in the metal. What is its left side?`,
    choices: [
      {correct: true, tex: raw`E_\perp A`},
      {tex: raw`2E_\perp A`, misconception: 'conductor-half',
        why: raw`That is a lone sheet’s pillbox, with flux through both faces. Here the face in the metal sees no field, since there is none in metal at rest, so only the outer face carries flux.`},
      {text: raw`$E_\perp A$ through the outer face, plus a part through the side`, misconception: 'parallel-patch',
        why: raw`Outside, the field is perpendicular to the conductor’s surface, so it lies along the pillbox’s side; inside the metal there is no field. The side carries nothing.`},
    ],
    explanation: raw`The face in the metal sees no field, and the side has the field along it outside and none inside. Only the outer face carries flux, $E_\perp A$; with $Q_{\text{enc}}=\sigma A$, that gives $E_\perp=\sigma/\varepsilon_0$.`,
    review: {lesson: 'conductors', stage: 'left', case: 'face'}},

  {id: 'conductors-twice', lesson: 'conductors', kind: 'check',
    prompt: raw`Just outside a conductor $E_\perp=\sigma/\varepsilon_0$, twice a lone sheet’s $\sigma/(2\varepsilon_0)$. Which is right?`,
    choices: [
      {correct: true, text: raw`Both. A lone sheet’s pillbox has flux through both faces; next to a conductor, the metal’s side has none, so all of it leaves through one face.`},
      {text: raw`The sheet’s: the conductor’s answer has lost a factor of two.`, misconception: 'conductor-half',
        why: raw`A pillbox at the conductor has one face in the metal, where there is no field, so $E_\perp A=\sigma A/\varepsilon_0$: no two to divide by.`},
      {text: raw`The conductor’s: a lone sheet’s field should be $\sigma/\varepsilon_0$ too.`, misconception: 'sheet-double',
        why: raw`A lone sheet has field on both sides, so its pillbox has flux through both faces, $2E_\perp A=\sigma A/\varepsilon_0$, and $E_\perp=\sigma/(2\varepsilon_0)$.`},
    ],
    explanation: raw`The two describe different charges. A lone sheet sends its flux out of both faces of the pillbox. At a conductor, all the other charge, the rest of the conductor’s and any near it, cancels the patch’s own field in the metal and doubles it outside, so all of the flux leaves through the outer face.`,
    review: {lesson: 'conductors', section: 'Check the answer', case: 'face'}},

  {id: 'conductors-wall', lesson: 'conductors', kind: 'setup',
    prompt: raw`A point charge $q$ sits at the centre of the hollow in the neutral metal ball. What charge does the hollow’s wall carry?`,
    choices: [
      {correct: true, tex: raw`-q`},
      {tex: raw`+q`, misconception: 'cavity-charge',
        why: raw`A sphere in the metal round the hollow has no flux, so it must enclose no net charge: $q$ plus the wall’s charge must be zero, and the wall carries $-q$.`},
      {tex: raw`0`, misconception: 'cavity-charge',
        why: raw`The metal is neutral as a whole, but its charge can move. A sphere in the metal round the hollow encloses no net charge, so $-q$ gathers on the wall, and $+q$ goes to the outer surface.`},
    ],
    explanation: raw`A sphere in the metal has $E_r=0$ on every patch, so its flux is zero and it encloses no net charge: $q+q_{\text{wall}}=0$, so $q_{\text{wall}}=-q$, of the opposite sign to $q$ whichever sign that is. The metal is neutral, so $+q$ is left on its outer surface.`,
    review: {lesson: 'conductors', stage: 'right', case: 'cavity'}},

  {id: 'conductors-outer', lesson: 'conductors', kind: 'transfer',
    prompt: raw`Now the metal ball carries a net charge $Q$ of its own, with $q$ still in the hollow. What charge is on its outer surface?`,
    choices: [
      {correct: true, tex: raw`Q+q`},
      {tex: raw`Q`, misconception: 'cavity-charge',
        why: raw`The wall carries $-q$, taken from the metal, so the metal’s other surface is left with $Q-(-q)=Q+q$. The metal hides where $q$ is, not how much.`},
      {tex: raw`Q-q`, misconception: 'cavity-charge',
        why: raw`The wall carries $-q$, and the wall and the outside together carry the metal’s $Q$. So the outside carries $Q+q$, not $Q-q$.`},
    ],
    explanation: raw`The wall still carries $-q$, since a sphere in the metal must enclose nothing. The metal’s two surfaces together carry its net $Q$, so the outer one carries $Q+q$, and outside the ball the field is that of $Q+q$ at the centre.`,
    review: {lesson: 'conductors', section: 'A hollow in the metal'}},

  {id: 'conductors-off-centre', lesson: 'conductors', kind: 'predict',
    prompt: raw`Move $q$ off the centre of the hollow, toward one side. What happens to the field outside the neutral metal ball?`,
    choices: [
      {correct: true, text: raw`Nothing: the wall’s $-q$ crowds toward $q$, but the outer charge stays spread evenly, and the field outside is still $q$’s, as from the centre.`},
      {text: raw`It grows on the side $q$ moved toward, since $q$ is nearer that side.`, misconception: 'cavity-charge',
        why: raw`The field-free metal screens the outside from where $q$ is. The outer surface’s charge on the round ball stays even, whatever $q$ does inside the hollow.`},
      {text: raw`It vanishes: the metal round the hollow hides $q$ from the outside.`, misconception: 'cavity-charge',
        why: raw`It hides where $q$ is, not how much. The wall’s $-q$ leaves $+q$ on the outside, and a sphere outside the ball encloses $q-q+q=q$.`},
    ],
    explanation: raw`The wall’s charge rearranges to keep the field in the metal zero wherever $q$ is, and still adds to $-q$. The outer surface carries $+q$, spread evenly on the round ball, so outside the field is $q/(4\pi\varepsilon_0r^2)$ from the centre, as before.`,
    review: {lesson: 'conductors', section: 'Check the answer', case: 'cavity'}},

  {id: 'conductors-negative-face', lesson: 'conductors', kind: 'transfer',
    prompt: raw`Where a conductor’s surface charge $\sigma$ is negative, which way does the field just outside point, and how big is it?`,
    choices: [
      {correct: true, text: raw`Into the metal, perpendicular to the surface, with size $|\sigma|/\varepsilon_0$.`},
      {text: raw`Out of the metal, with size $|\sigma|/\varepsilon_0$, since $\sigma/\varepsilon_0$ is a size.`, misconception: 'sign',
        why: raw`$E_\perp=\sigma/\varepsilon_0$ is the field’s signed part along the outward normal. For a negative $\sigma$ it is negative, and the field points into the metal.`},
      {text: raw`Into the metal, with size $|\sigma|/(2\varepsilon_0)$, a lone sheet’s.`, misconception: 'conductor-half',
        why: raw`The direction is right, but next to a conductor all the flux leaves through one face of the pillbox, so the size is $|\sigma|/\varepsilon_0$.`},
    ],
    explanation: raw`The one-sided pillbox gives $E_\perp A=\sigma A/\varepsilon_0$ for either sign. For a negative $\sigma$, $E_\perp$ is negative: the field points into the metal, perpendicular to its surface, with size $|\sigma|/\varepsilon_0$.`,
    review: {lesson: 'conductors', stage: 'solve', case: 'face'}},

  {id: 'conductors-diameter', lesson: 'conductors', kind: 'transfer',
    prompt: raw`A metal ball of diameter $D$ carries a charge $Q$. What is the size of the field just outside it?`,
    choices: [
      {correct: true, tex: raw`\frac{4k|Q|}{D^2}`},
      {tex: raw`\frac{k|Q|}{D^2}`, misconception: 'diameter-radius',
        why: raw`The distance from the centre is the radius, $D/2$, not the diameter. Squared, the half becomes a quarter, and the field is four times what $k|Q|/D^2$ says.`},
      {tex: raw`\frac{2k|Q|}{D^2}`, misconception: 'conductor-half',
        why: raw`That is $|\sigma|/(2\varepsilon_0)$ with $\sigma=Q/(\pi D^2)$, a lone sheet’s field. Just outside a conductor it is $|\sigma|/\varepsilon_0$, twice that.`},
    ],
    explanation: raw`The charge spreads evenly over the surface, $\sigma=Q/(4\pi(D/2)^2)=Q/(\pi D^2)$, and just outside, $|\sigma|/\varepsilon_0=4k|Q|/D^2$. A sphere of radius $D/2$ round the ball gives the same: $k|Q|/(D/2)^2$.`,
    review: {lesson: 'conductors', section: 'Check the answer', case: 'ball'}},
];
