import type {Question} from '../types';
const raw = String.raw;

/* SHEETS AND SLABS, in its lesson's symbols (src/gauss/lessons/sheets.ts): an infinite sheet of σ, a slab between
 * z = minus a and z = a of uniform ρ, and a capacitor's plates, two sheets of σ and minus σ a distance d apart. A
 * pillbox with faces of area A at heights z and minus z gives 2E_⊥A = Q_enc/ε₀; E_⊥ is the field's signed part along
 * each face's outward normal, negative where it points toward the charge. Every result here is checked by number in
 * tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'sheets-faces', lesson: 'sheets', kind: 'setup',
    prompt: raw`A pillbox stands across the infinite sheet, with faces of area $A$ at heights $z$ and $-z$. What is its left side, $\oint\vec E\cdot d\vec A$?`,
    choices: [
      {correct: true, tex: raw`2E_\perp A`},
      {tex: raw`E_\perp A`, misconception: 'pillbox-two',
        why: raw`That counts one face. The field crosses both: on each face it points along that face’s outward normal, or against it on both faces. Each face carries $E_\perp A$.`},
      {tex: raw`0`, misconception: 'pillbox-two',
        why: raw`The two faces’ normals do point opposite ways, but so does the field on them: away from the sheet on both sides, or toward it on both. Each face carries $E_\perp A$ with the same sign, and they add.`},
    ],
    explanation: raw`On both faces $d\vec A$ points away from the sheet, and the field points the same way as $d\vec A$ on both, or the opposite way on both. So each face carries $E_\perp A$, the side carries nothing since the field lies along it, and the left side is $2E_\perp A$.`,
    review: {lesson: 'sheets', stage: 'left', case: 'sheet'}},

  {id: 'sheets-field', lesson: 'sheets', kind: 'setup',
    prompt: raw`With $2E_\perp A=\sigma A/\varepsilon_0$, what is the infinite sheet’s field?`,
    choices: [
      {correct: true, tex: raw`E_\perp=\frac{\sigma}{2\varepsilon_0}`},
      {tex: raw`E_\perp=\frac{\sigma}{\varepsilon_0}`, misconception: 'sheet-double',
        why: raw`That drops the two: a lone sheet’s flux crosses both faces, half each way. $\sigma/\varepsilon_0$ is the field just outside a conductor, where all of it leaves through one face.`},
      {tex: raw`E_\perp=\frac{\sigma A}{2\varepsilon_0}`, misconception: 'size-left-in',
        why: raw`The face area is on both sides, in $2E_\perp A$ and in $\sigma A$, and cancels. A field cannot depend on the size of a surface you drew.`},
    ],
    explanation: raw`Dividing by $2A$ gives $E_\perp=\sigma/(2\varepsilon_0)$, which with $k=1/(4\pi\varepsilon_0)$ is the Infinite sheet lesson’s $2\pi k\sigma$. It points away from the sheet on both sides for a positive $\sigma$, toward it for a negative one.`,
    review: {lesson: 'sheets', stage: 'solve', case: 'sheet'}},

  {id: 'sheets-taller', lesson: 'sheets', kind: 'predict',
    prompt: raw`Make the pillbox taller, its faces farther from the sheet. What happens to the field on its faces?`,
    choices: [
      {correct: true, text: raw`Nothing: the box holds the same charge, $\sigma A$, and its left side is still $2E_\perp A$, so $E_\perp$ is the same at every height.`},
      {text: raw`It weakens, since the faces are farther from the charge.`, misconception: 'sheet-falloff',
        why: raw`For a point or a line, farther means weaker. An infinite sheet looks the same from every height, so its field has nothing to fall off against.`},
      {text: raw`It grows, since a taller box holds more of the field.`, misconception: 'bigger-surface',
        why: raw`The flux is the charge inside over $\varepsilon_0$, and a taller box round a thin sheet holds no more charge. The flux, and the field on the faces, stay the same.`},
    ],
    explanation: raw`Height never enters: the charge inside is $\sigma A$ for every height, and so is the flux. Drag the height in the lesson and the profile stays flat at $\sigma/(2\varepsilon_0)$.`,
    review: {lesson: 'sheets', section: 'A sheet: no height in the answer'}},

  {id: 'sheets-slab-qenc', lesson: 'sheets', kind: 'setup',
    prompt: raw`Inside the slab, $0<z<a$, the pillbox’s faces are at $z$ and $-z$. How much charge does it hold?`,
    choices: [
      {correct: true, tex: raw`2\rho Az`},
      {tex: raw`\rho Az`, misconception: 'pillbox-two',
        why: raw`That is the half of the block above the middle. The pillbox runs from $-z$ to $z$, a thickness of $2z$.`},
      {tex: raw`2\rho Aa`, misconception: 'qenc-limit',
        why: raw`That is the slab’s whole thickness, which a pillbox holds only once its faces are outside the slab. Inside, the slices run only from $-z$ to $z$.`},
    ],
    explanation: raw`Slices of volume $A\,dz'$ from $-z$ to $z$ add to $\int_{-z}^{z}\rho A\,dz'=2\rho Az$. With $2E_\perp A$ on the left, the twos cancel and $E_\perp=\rho z/\varepsilon_0$, growing from zero at the middle.`,
    review: {lesson: 'sheets', stage: 'right', case: 'slab'}},

  {id: 'sheets-slab-outside', lesson: 'sheets', kind: 'check',
    prompt: raw`From outside, the thick slab looks like a sheet. With what $\sigma$, and does its field agree with $\rho a/\varepsilon_0$?`,
    choices: [
      {correct: true, text: raw`$\sigma=2\rho a$, the charge in a column through the whole thickness, and $\sigma/(2\varepsilon_0)=\rho a/\varepsilon_0$: it agrees.`},
      {text: raw`$\sigma=\rho a$, so its field is $\rho a/(2\varepsilon_0)$: the slab’s answer is twice too big.`, misconception: 'pillbox-two',
        why: raw`A column through the slab runs from $-a$ to $a$, a thickness of $2a$, so it holds $2\rho a$ per unit area, not $\rho a$.`},
      {text: raw`$\sigma=2\rho a$, so its field is $\sigma/\varepsilon_0=2\rho a/\varepsilon_0$: the slab’s answer is half too small.`, misconception: 'sheet-double',
        why: raw`A lone sheet’s field is $\sigma/(2\varepsilon_0)$, half each way. $\sigma/\varepsilon_0$ belongs next to a conductor.`},
    ],
    explanation: raw`Per unit area the slab holds $2\rho a$, so from outside it is a sheet with $\sigma=2\rho a$, whose field is $\sigma/(2\varepsilon_0)=\rho a/\varepsilon_0$, as the pillbox found. Squash the slab thin keeping $2\rho a$ fixed and you have the sheet.`,
    review: {lesson: 'sheets', section: 'Check the answer', case: 'slab'}},

  {id: 'sheets-between', lesson: 'sheets', kind: 'predict',
    prompt: raw`Between the capacitor’s plates, carrying $\sigma$ and $-\sigma$, what is the field?`,
    choices: [
      {correct: true, text: raw`$E_\perp=\sigma/\varepsilon_0$, measured from the plate carrying $\sigma$ toward the one carrying $-\sigma$: the two sheets’ fields add, pointing from the positive plate to the negative one.`},
      {text: raw`None: the plates’ charges add to zero.`, misconception: 'plates-add',
        why: raw`They cancel outside the pair, where the two fields point opposite ways. Between the plates, away from the positive plate and toward the negative one are the same direction, so the fields add.`},
      {text: raw`$\sigma/(2\varepsilon_0)$, the nearer plate’s own field: a pillbox round one plate encloses only that plate.`, misconception: 'only-inside-field',
        why: raw`The pillbox’s flux counts only the plate inside it, but the field on its faces is made by both plates. Between them the other plate’s field adds an equal amount.`},
    ],
    explanation: raw`Each plate alone makes $|\sigma|/(2\varepsilon_0)$, away from the positive plate and toward the negative one, at every distance. Between the plates those directions agree, so measured from the $\sigma$ plate toward the $-\sigma$ one each adds $\sigma/(2\varepsilon_0)$, and $E_\perp=\sigma/\varepsilon_0$, the same everywhere between them.`,
    review: {lesson: 'sheets', section: 'Two sheets: superposition first'}},

  {id: 'sheets-both-plates', lesson: 'sheets', kind: 'check',
    prompt: raw`A pillbox standing across both of the capacitor’s plates encloses $\sigma A-\sigma A=0$. What does that tell you about the field outside the pair?`,
    choices: [
      {correct: true, text: raw`Only that it is the same above the pair as below it. That it is zero comes from adding the two sheets’ fields.`},
      {text: raw`That it is zero: no flux through the pillbox means no field on its faces.`, misconception: 'zero-flux-zero-field',
        why: raw`Zero flux means the top face’s flux and the bottom face’s cancel, which a uniform field pointing the same way above and below would also do. It does not say the field is zero.`},
      {text: raw`Nothing: Gauss’s law does not hold for two sheets with opposite charges.`, misconception: 'law-fails',
        why: raw`It holds for every closed surface: the flux through this pillbox is zero, as the law says. It only leaves the field’s size open, which superposition settles.`},
    ],
    explanation: raw`With $E_z$ above and below, the faces carry $E_z^{\text{above}}A$ and $-E_z^{\text{below}}A$, and zero flux says only $E_z^{\text{above}}=E_z^{\text{below}}$. Adding the sheets’ fields, which point opposite ways outside, gives zero there.`,
    review: {lesson: 'sheets', section: 'Check the answer', case: 'plates'}},

  {id: 'sheets-same-sign', lesson: 'sheets', kind: 'transfer',
    prompt: raw`Give both plates the same charge, $\sigma$ each. Where is there a field now?`,
    choices: [
      {correct: true, text: raw`Outside the pair, $|\sigma|/\varepsilon_0$ in size, away from the plates for a positive $\sigma$ and toward them for a negative one; between them, none.`},
      {text: raw`Between the plates, $\sigma/\varepsilon_0$, and none outside, as for a capacitor.`, misconception: 'plates-add',
        why: raw`That was for opposite charges. With the same charge, the two fields point opposite ways between the plates and cancel, and the same way outside, where they add.`},
      {text: raw`$\sigma/(2\varepsilon_0)$ everywhere, each region seeing the nearer plate alone.`, misconception: 'plates-add',
        why: raw`Each sheet’s field reaches everywhere, the same at every distance. Every region sees both plates, and their fields add or cancel there.`},
    ],
    explanation: raw`Each plate makes $|\sigma|/(2\varepsilon_0)$ on both sides. Between them, one sheet’s field points one way and the other’s the opposite way, so they cancel; outside, both point the same way and add to $\sigma/\varepsilon_0$, away from the pair for a positive $\sigma$.`,
    review: {lesson: 'sheets', stage: 'symmetry', case: 'plates'}},

  {id: 'sheets-jump', lesson: 'sheets', kind: 'check',
    prompt: raw`Crossing the lone sheet from just below it to just above, how much does $E_z$ change?`,
    choices: [
      {correct: true, tex: raw`\frac{\sigma}{\varepsilon_0}`},
      {tex: raw`0`, misconception: 'symmetry-forbids',
        why: raw`The field has the same size on both sides but points away from the sheet on both, or toward it on both, so $E_z$ is $\sigma/(2\varepsilon_0)$ above and $-\sigma/(2\varepsilon_0)$ below: its sign flips.`},
      {tex: raw`\frac{\sigma}{2\varepsilon_0}`, misconception: 'pillbox-two',
        why: raw`That would be a field on one side only. The sheet’s field is on both sides, half its flux each way, so $E_z$ goes from $-\sigma/(2\varepsilon_0)$ to $\sigma/(2\varepsilon_0)$.`},
    ],
    explanation: raw`Just above, $E_z=\sigma/(2\varepsilon_0)$; just below, $-\sigma/(2\varepsilon_0)$. The jump is $\sigma/\varepsilon_0$, for either sign of $\sigma$: the rule across every surface charge, and a quick check for a lost factor of two.`,
    review: {lesson: 'sheets', section: 'The jump across a surface charge'}},

  {id: 'sheets-negative-slab', lesson: 'sheets', kind: 'transfer',
    prompt: raw`Give the slab a negative $\rho$. Outside it, which way does the field point, and how does its size change with height?`,
    choices: [
      {correct: true, text: raw`Toward the slab on both sides, with the same size, $|\rho|a/\varepsilon_0$, at every height.`},
      {text: raw`Away from the slab above it and toward it below, the same way on both sides.`, misconception: 'symmetry-forbids',
        why: raw`Flipping the slab over its middle leaves it as it was, so the field below is the mirror of the field above: toward the slab on both sides for a negative $\rho$, or away on both for a positive one.`},
      {text: raw`Toward the slab on both sides, weakening farther away.`, misconception: 'sheet-falloff',
        why: raw`From outside, the slab is a sheet with $\sigma=2\rho a$, and an infinite sheet’s field is the same at every height.`},
    ],
    explanation: raw`Outside, $E_\perp=\rho a/\varepsilon_0$ whatever the height, and for a negative $\rho$ it is negative: the field points toward the slab, on both sides, with the same size everywhere outside.`,
    review: {lesson: 'sheets', stage: 'solve', case: 'slab'}},
];
