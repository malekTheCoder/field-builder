import type {Question} from '../types';
const raw = String.raw;

/* THE INFINITE SHEET, in its lesson's symbols (src/lessons/sheet.ts): density σ in the xy-plane, P at height z on
 * the axis, rings of equal angle Δα at P, s = z tan α, rᵢ = z sec α, a ring z sec²α Δα wide holding
 * ΔQ = σ(2πs)(z sec²α Δα) and making ΔE_z = 2πkσ sin α Δα. Its story is the reverse of the lines': cut at equal
 * angles the FAR rings make the larger fields, so nothing here says the far parts matter less. Every result and
 * comparison here is checked by number in tests/quiz-physics.test.ts. */
export const bank: Question[] = [
  {id: 'sheet-far-rings', lesson: 'sheet', kind: 'predict',
    prompt: raw`Cut the sheet into rings that each take the same small angle $\Delta\alpha$ at $P$. Which makes the larger field at $P$: a ring far out, or one near the axis?`,
    choices: [
      {correct: true, text: raw`The far ring: it is weaker for each unit of its charge, but it holds so much more charge that its field at $P$ is larger.`},
      {text: raw`The near ring: the far ring is farther away, so its field at $P$ is weaker.`, misconception: 'sheet-far-pieces',
        why: raw`Farther away is weaker for the same charge, but these rings do not hold the same charge. Cut at equal angles, a far ring is both wider and longer round, and that more than makes up for its distance.`},
      {text: raw`Neither: rings of equal angle make equal fields, as the pieces of an endless line do.`, misconception: 'sheet-far-pieces',
        why: raw`On an endless line every piece of equal angle makes a field of the same size. A ring of the sheet runs round the axis as well, and a far ring is much longer round than a near one, so it holds more charge for the angle it takes.`},
      {text: raw`The near ring: the far ring’s field is nearly sideways, so most of it cancels round the ring.`, misconception: 'sheet-far-pieces',
        why: raw`Only $\cos\alpha$ of each bit’s field survives along the axis, and for a far ring that fraction is small. But the far ring holds so much more charge that its part along the axis is still the larger: $2\pi k|\sigma|\sin\alpha\,\Delta\alpha$ grows with $\alpha$.`},
    ],
    explanation: raw`A representative thin ring at the middle angle $\alpha$ is assigned $\sigma(2\pi s)(z\sec^2\alpha\,\Delta\alpha)$, and its field at $P$ comes to $2\pi k\sigma\sin\alpha\,\Delta\alpha$, whose magnitude grows with $\alpha$. A far ring is farther away, and its field meets the axis more slantwise, but it is so much bigger that its share of the field is larger: here the far parts of the charge matter most.`,
    review: {lesson: 'sheet', stage: 'piece'}},

  {id: 'sheet-dq', lesson: 'sheet', kind: 'setup',
    prompt: raw`The ring at the angle $\alpha$ takes the angle $\Delta\alpha$ at $P$, and its radius is $s=z\tan\alpha$. What charge is assigned to its representative thin ring at the middle angle?`,
    choices: [
      {correct: true, tex: raw`\Delta Q=\sigma\,(2\pi s)(z\sec^2\alpha\,\Delta\alpha)`},
      {tex: raw`\Delta Q=\sigma\,(2\pi s)(z\,\Delta\alpha)`, misconception: 'jacobian',
        why: raw`An angle $\Delta\alpha$ at $P$ does not cut the same width of sheet everywhere. With $s=z\tan\alpha$, the representative width is $z\sec^2\alpha\,\Delta\alpha$, far wider for the far rings.`},
      {tex: raw`\Delta Q=\sigma\,z\sec^2\alpha\,\Delta\alpha`, misconception: 'ring-area',
        why: raw`$\sigma$ is a charge per unit area, and $z\sec^2\alpha\,\Delta\alpha$ is only the representative width. Its area is that width times its length round, $2\pi s$.`},
      {tex: raw`\Delta Q=\sigma\,(2\pi s)\,\Delta\alpha`, misconception: 'piece-length',
        why: raw`$\Delta\alpha$ is an angle, not a width. The representative width is $z\sec^2\alpha\,\Delta\alpha$, and that is what multiplies its length round.`},
    ],
    explanation: raw`From $s=z\tan\alpha$, the local width per angle is $z\sec^2\alpha$. Multiply by $\Delta\alpha$, circumference $2\pi s$ and density $\sigma$ to assign the representative charge. This approximates a narrow finite ring’s charge; the outermost ring has unbounded charge, while its finite representative approximates its field.`,
    review: {lesson: 'sheet', stage: 'cut'}},

  {id: 'sheet-one-ring', lesson: 'sheet', kind: 'setup',
    prompt: raw`Put $s=z\tan\alpha$, $r_i=z\sec\alpha$ and that $\Delta Q$ into $\Delta E_z=k\,\Delta Q\cos\alpha/r_i^2$. What is left?`,
    choices: [
      {correct: true, tex: raw`\Delta E_z=2\pi k\sigma\sin\alpha\,\Delta\alpha`},
      {tex: raw`\Delta E_z=2\pi k\sigma\tan\alpha\,\Delta\alpha`, misconception: 'projection',
        why: raw`That is $k\,\Delta Q/r_i^2$ whole, without the $\cos\alpha$. Round the ring the sideways parts cancel, and only $\cos\alpha$ of the field is left along the axis.`},
      {tex: raw`\Delta E_z=2\pi k\sigma\sin\alpha\tan\alpha\,\Delta\alpha`, misconception: 'wrong-part',
        why: raw`That projects with $\sin\alpha$, the sideways part, which cancels round the ring. The part along the axis is adjacent to $\alpha$, so it takes $\cos\alpha$.`},
      {tex: raw`\Delta E_z=2\pi k\sigma\sin\alpha\cos^2\alpha\,\Delta\alpha`, misconception: 'jacobian',
        why: raw`That takes the ring as $z\,\Delta\alpha$ wide. With $s=z\tan\alpha$ its representative width is $z\sec^2\alpha\,\Delta\alpha$, and those two powers of $\sec\alpha$ cancel the $\cos^2\alpha$.`},
    ],
    explanation: raw`$\Delta Q=2\pi\sigma z^2\tan\alpha\sec^2\alpha\,\Delta\alpha$ and $r_i^2=z^2\sec^2\alpha$, so $k\,\Delta Q/r_i^2=2\pi k\sigma\tan\alpha\,\Delta\alpha$, and times $\cos\alpha$ that is $2\pi k\sigma\sin\alpha\,\Delta\alpha$. Every $z$ has cancelled, and the magnitude of what is left grows with $\alpha$.`,
    review: {lesson: 'sheet', stage: 'piece'}},

  {id: 'sheet-finite', lesson: 'sheet', kind: 'predict',
    prompt: raw`The sheet never ends, and holds charge without end. Why is its field at $P$ finite?`,
    choices: [
      {correct: true, text: raw`Seen from $P$ the sheet spans only a right angle out from the axis, and no ring of equal angle adds more than $2\pi k|\sigma|\,\Delta\alpha$ in size.`},
      {text: raw`The far rings are too far away to add much.`, misconception: 'sheet-far-pieces',
        why: raw`Cut at equal angles, the far rings add the most, not the least. The sum is finite because there is only a right angle of them, and each adds at most $2\pi k|\sigma|\,\Delta\alpha$ in size.`},
      {text: raw`It is not: charge without end makes a field without end, and $\sigma/(2\varepsilon_0)$ holds only close to the sheet.`, misconception: 'endless-field',
        why: raw`The field is finite at every height: the rings fill only a right angle at $P$, and each adds a bounded amount for the angle it takes. The answer, $\sigma/(2\varepsilon_0)$, holds at every height.`},
      {text: raw`The rings’ fields cancel each other, far against near.`, misconception: 'cancel-survivor',
        why: raw`Every ring is on the same side of $P$, so every ring’s part along the axis points the same way, away from the sheet for positive $\sigma$. The rings add; nothing cancels between them.`},
    ],
    explanation: raw`Cut at equal angles, the endless sheet becomes rings from $\alpha=0$ out toward a right angle, a finite span. Each adds $2\pi k\sigma\sin\alpha\,\Delta\alpha$, never more than $2\pi k|\sigma|\,\Delta\alpha$ in size, so the sum is finite: the integral of $\sin\alpha$ over that right angle is one, and $E_z=2\pi k\sigma$.`,
    review: {lesson: 'sheet', stage: 'add'}},

  {id: 'sheet-bounds', lesson: 'sheet', kind: 'setup',
    prompt: raw`The integral adds the rings, written in the angle $\alpha$ at $P$. What are its bounds?`,
    choices: [
      {correct: true, tex: raw`\int_0^{\pi/2}\cdots\,d\alpha`},
      {tex: raw`\int_{-\pi/2}^{\pi/2}\cdots\,d\alpha`, misconception: 'bounds',
        why: raw`Here $\alpha$ runs outward from the downward axis, so it cannot be negative. Negative angles give negative radii $s=z\tan\alpha$; extending the odd $\sin\alpha$ integrand there would make false opposite contributions cancel to zero.`},
      {tex: raw`\int_0^{\pi}\cdots\,d\alpha`, misconception: 'bounds',
        why: raw`Past a right angle the line from $P$ points up, away from the sheet, and meets no ring. The whole sheet lies within a right angle of the axis.`},
      {tex: raw`\int_0^{2\pi}\cdots\,d\alpha`, misconception: 'bounds',
        why: raw`Once round is already in each ring’s circumference, $2\pi s$. $\alpha$ is the angle at $P$ between the axis and the line to a ring, and it runs only to a right angle.`},
    ],
    explanation: raw`$\alpha$ is the angle between the axis and the line from $P$ to a ring. The ring straight below has $\alpha=0$, and as the rings go out without end $\alpha$ approaches a right angle, so the integral runs from $0$ to $\pi/2$.`,
    review: {lesson: 'sheet', stage: 'shrink'}},

  {id: 'sheet-height', lesson: 'sheet', kind: 'check',
    prompt: raw`Raise $P$ to twice its height above the sheet. What happens to the field at $P$?`,
    choices: [
      {correct: true, text: raw`It stays the same.`},
      {text: raw`It halves.`, misconception: 'sheet-falloff',
        why: raw`That is an endless line’s fall-off, as $1/r$. A sheet’s field does not fall at all: raise $P$ and every ring of equal angle is the same ring scaled up, making the same field at $P$.`},
      {text: raw`It falls to a quarter.`, misconception: 'sheet-falloff',
        why: raw`That is a point charge’s fall-off, as $1/r^2$. Raise $P$ to twice the height and each ring of equal angle holds four times the charge at twice the distance, so its field at $P$ is unchanged.`},
      {text: raw`It falls toward zero, as any charge’s does far away.`, misconception: 'sheet-falloff',
        why: raw`Only a finite charge looks like a point from far away. The sheet never ends, so however high $P$ goes there is no far away from it: its field is $\sigma/(2\varepsilon_0)$ at every height.`},
    ],
    explanation: raw`$E_z=\sigma/(2\varepsilon_0)$ has no $z$ in it. Raise $P$ to twice the height and the ring that took a given angle is replaced by one twice as big in every direction: four times the charge at twice the distance, so its field at $P$ is exactly what it was.`,
    review: {lesson: 'sheet', section: 'What the answer says'}},

  {id: 'sheet-why-no-height', lesson: 'sheet', kind: 'predict',
    prompt: raw`Why does the sheet’s field have no $z$ in it?`,
    choices: [
      {correct: true, text: raw`Raise $P$ and each ring of equal angle scales with it: its charge magnitude grows as the square of the height and its distance as the height, so its field at $P$ stays the same.`},
      {text: raw`Only the patch of sheet nearly below $P$ counts; the far rings are too far away to matter.`, misconception: 'sheet-far-pieces',
        why: raw`Cut at equal angles, the far rings count the most, not the least. The field stays the same because every ring, near and far, scales with the height and keeps its field at $P$.`},
      {text: raw`Raise $P$ and each ring’s charge magnitude grows in proportion to the height, as its distance does, and the two cancel.`, misconception: 'ring-area',
        why: raw`A ring’s charge is $\sigma$ times its area, and both its width and its length round grow with the height, so its charge magnitude grows as the square of the height. That is what an inverse-square field needs to stay the same.`},
    ],
    explanation: raw`At twice the height, the ring that took a given angle at $P$ is twice as big in every direction: four times the area, so four times the charge, at twice the distance. An inverse-square field from four times the charge at twice the distance is the same field. The sheet has no edge or size to measure the height against.`,
    review: {lesson: 'sheet', section: 'What the answer says'}},

  {id: 'sheet-from-disk', lesson: 'sheet', kind: 'check',
    prompt: raw`A disk’s field is $\dfrac{\sigma}{2\varepsilon_0}\left(1-\dfrac{z}{\sqrt{R^2+z^2}}\right)$. Which limit turns it into the sheet’s?`,
    choices: [
      {correct: true, text: raw`$R\to\infty$, with $\sigma$ held fixed.`},
      {text: raw`$R\to\infty$, with $Q$ held fixed.`, misconception: 'held-total-charge',
        why: raw`With $Q$ fixed the same charge is spread ever thinner: $\sigma=Q/(\pi R^2)$ goes to zero, and so does the field. A sheet keeps its $\sigma$, so its charge magnitude grows without end.`},
      {text: raw`$z\gg R$, far up the axis.`, misconception: 'far-limit',
        why: raw`Far away the disk looks like a point charge, and its field falls as $kQ/z^2$. A sheet is the opposite: a disk whose edge is far away compared with $z$.`},
    ],
    explanation: raw`With $\sigma$ fixed and $R\to\infty$, $z/\sqrt{R^2+z^2}$ goes to zero at every height, and the field becomes $\sigma/(2\varepsilon_0)$. The same happens close to a disk’s centre, $z\ll R$, which is why a large disk looks like a sheet from near its middle.`,
    review: {lesson: 'sheet', section: 'Limiting cases'}},

  {id: 'sheet-negative', lesson: 'sheet', kind: 'transfer',
    prompt: raw`Make $\sigma$ negative. What is the field at $P$, above the sheet?`,
    choices: [
      {correct: true, text: raw`$|\sigma|/(2\varepsilon_0)$ in size, pointing toward the sheet, the same at every height.`},
      {text: raw`$|\sigma|/(2\varepsilon_0)$ in size, pointing away from the sheet.`, misconception: 'sign',
        why: raw`That is a positive sheet’s field. A negative charge turns every ring’s arrow round, so the field points toward the sheet.`},
      {text: raw`Toward the sheet, and stronger the closer $P$ is to it.`, misconception: 'sheet-falloff',
        why: raw`The sign turns the field round but gives it no fall-off. Every ring of equal angle still scales with the height, so the field is the same at every height.`},
    ],
    explanation: raw`Each ring’s field now points toward the ring. The sideways parts still cancel round each ring, and every ring’s part along the axis points toward the sheet. $E_z=\sigma/(2\varepsilon_0)$ has the sign of $\sigma$ and no $z$ in it.`,
    review: {lesson: 'sheet', section: 'What cancels'}},

  {id: 'sheet-disk-lacks', lesson: 'sheet', kind: 'transfer',
    prompt: raw`A disk of radius $R$ is the sheet with every ring beyond some angle $\alpha_R$ at $P$ taken away. Which rings does it lack, and how much do they matter?`,
    choices: [
      {correct: true, text: raw`The rings near a right angle, which add the most for each angle they span; so the disk falls well short of the sheet unless $z\ll R$.`},
      {text: raw`The far rings, which hardly add anything; so the disk’s field is nearly the sheet’s at any height.`, misconception: 'sheet-far-pieces',
        why: raw`Cut at equal angles, the rings near a right angle add the most. With $P$ as high above the disk as its radius, the disk gives less than a third of the sheet’s field.`},
      {text: raw`The rings near the axis, straight below $P$; so the disk is weaker than the sheet close in.`, misconception: 'bounds',
        why: raw`A disk centred under $P$ keeps every ring from the axis out to its rim, $\alpha$ from $0$ to $\alpha_R$. What it lacks lies beyond the rim: the rings near a right angle.`},
    ],
    explanation: raw`The disk reaches only out to $\alpha_R$, with $\cos\alpha_R=z/\sqrt{R^2+z^2}$, and the integral stopped there gives $2\pi k\sigma(1-\cos\alpha_R)$, the disk lesson’s answer. The missing rings, near a right angle, add the most for each angle, so the disk matches the sheet only when $z\ll R$ and $\alpha_R$ is itself nearly a right angle.`,
    review: {lesson: 'sheet', section: 'What the answer says'}},
];
