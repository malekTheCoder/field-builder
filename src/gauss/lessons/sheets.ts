import type {GaussLesson} from '../types';
const raw = String.raw;
/* SHEETS AND SLABS. The planar third of the recipe: a pillbox standing across the charge, whose side carries no flux
 * and whose two faces each carry E_⊥A, so the left side is 2E_⊥A and the face area A cancels. Three cases, as the
 * owner's study guide orders them: the infinite sheet (checked against the integral lesson's σ/2ε₀, with no height
 * in it), a thick slab of uniform ρ (the pillbox from −z to +z, the factor of two in Q_enc, the field growing as z
 * inside and constant outside), and two parallel sheets of opposite charge, a capacitor, found by superposition
 * (σ/ε₀ between, nothing outside) and checked with a one-sided pillbox, the move the Conductors lesson needs next.
 * The profile under the figure shows the sheet's field flat as the pillbox's height is dragged. E_⊥ is the
 * field's signed part along each face's outward normal, negative where the field points toward the charge. */
/** The field drawn at the standard arrow length in every case: a little more than the capacitor's σ/ε₀ = 4πkσ for
 * unit σ. One scale for the lesson, so the capacitor's field is drawn twice as long as a lone sheet's σ/(2ε₀); and
 * small enough that the capacitor's arrow fits whole between the plates, on one side of its face or the other,
 * wherever the pillbox's face is dragged, so a uniform field is drawn one length all the way across. */
const REFERENCE = 4.2 * Math.PI;
export const lesson: GaussLesson = {
  id: 'sheets',
  title: 'Sheets and slabs',
  short: 'Sheets and slabs',
  about: 'A pillbox through a sheet or a thick slab, and why, for a sheet, the distance drops out.',
  lead: raw`Across a flat charge, stand a pillbox as the Gaussian surface: its side carries no flux, its two faces carry $E_\perp A$ each, and the face area $A$ cancels. For an infinite sheet the height never enters, so its field is the same at every distance.`,
  sections: [
    {heading: 'The pillbox', body: [
      raw`A charge that depends only on the height $z$ above a plane, and is the same at equal heights above and below it, makes a field perpendicular to the plane, pointing away from the middle on both sides (or toward it on both), with the same size at $z$ and at $-z$. The surface that matches is a pillbox standing across the middle: two flat faces of area $A$ at heights $z$ and $-z$, joined by a side.`,
      raw`On each face $d\vec A$ points away from the middle, and the field points the same way as $d\vec A$ on both faces, or the opposite way on both: each face carries $E_\perp A$ with the same sign. The side has $\vec E$ along it and carries nothing. So:`,
      {tex: raw`\oint\vec E\cdot d\vec A=E_\perp A+E_\perp A+0=2E_\perp A`},
      raw`The faces can be any shape; only their area enters, and it cancels against the $A$ in the charge inside. That needs the charge to be the same all across the plane: let $\sigma$ vary from place to place on the sheet and the field leans, and the pillbox no longer works.`,
    ]},
    {heading: 'A sheet: no height in the answer', body: [
      raw`An infinite sheet with $\sigma$ per unit area puts $\sigma A$ inside the pillbox, whatever its height, so $2E_\perp A=\sigma A/\varepsilon_0$ and`,
      {tex: raw`E_\perp=\frac{\sigma}{2\varepsilon_0}`},
      raw`That is the field the Infinite sheet lesson reached by adding rings, with no $z$ in it there either. A taller pillbox has its faces farther from the sheet, but they see the same field and the box holds the same charge. From any height an infinite sheet looks the same, so its field cannot fall off.`,
    ]},
    {heading: 'A thick slab, and the factor of two', body: [
      raw`Fill the region between $z=-a$ and $z=a$ with a uniform density $\rho$. The slab is the same above and below its middle, so stand the pillbox there, faces at $z$ and $-z$. Inside the slab the pillbox holds a block of thickness $2z$, not $z$:`,
      {tex: raw`Q_{\text{enc}}=\int_{-z}^{z}\rho A\,dz'=2\rho Az`},
      raw`and $2E_\perp A=2\rho Az/\varepsilon_0$ gives $E_\perp=\rho z/\varepsilon_0$, growing from zero at the middle. Outside, the integral stops at $a$, the box holds $2\rho Aa$ whatever its height, and $E_\perp=\rho a/\varepsilon_0$ for good. From outside the slab looks like a sheet with $\sigma=2\rho a$, and $\sigma/(2\varepsilon_0)$ agrees. The two halves of the answer meet at $z=a$: a volume charge has no surface charge to make a jump.`,
    ]},
    {heading: 'Two sheets: superposition first', body: [
      raw`A capacitor’s plates are two parallel sheets carrying $\sigma$ and $-\sigma$, here with the $\sigma$ plate above. A pillbox standing across both plates encloses zero net charge, so the flux through it is zero. That says only that the field above the pair is the same as the field below it, in size and direction, which a uniform field could also do; it does not give the size. For that, add the two sheets’ fields. Each has size $|\sigma|/(2\varepsilon_0)$, away from the positive sheet and toward the negative one. Between the plates the two point the same way and add; outside, they point opposite ways and cancel. Measured from the $\sigma$ plate toward the $-\sigma$ one:`,
      {tex: raw`E_{\text{between}}=\frac{\sigma}{2\varepsilon_0}+\frac{\sigma}{2\varepsilon_0}=\frac{\sigma}{\varepsilon_0},\qquad E_{\text{outside}}=0`},
      raw`Gauss’s law then checks it with a pillbox round one plate, one face outside where there is no field and one between. Only the inner face carries flux, $E_\perp A=\sigma A/\varepsilon_0$, and $\sigma/\varepsilon_0$ comes back. A pillbox with flux through one face is how the field next to a conductor is found, in the next lesson.`,
    ]},
    {heading: 'The jump across a surface charge', body: [
      raw`Every case here shows the same rule. Write $E_z$ for the field’s part along the fixed upward direction. Crossing a sheet of charge $\sigma$ upward, $E_z$ jumps by $\sigma/\varepsilon_0$: from $-\sigma/(2\varepsilon_0)$ to $\sigma/(2\varepsilon_0)$ across a lone sheet, and, with the $\sigma$ plate above the $-\sigma$ one, from $-\sigma/\varepsilon_0$ between the plates to $0$ above them. Across a volume charge, like the slab’s faces, there is no jump at all. Checking for it is a quick way to catch a lost factor of two.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§6.3, Applying Gauss’s Law: systems with planar symmetry', url: 'https://openstax.org/books/university-physics-volume-2/pages/6-3-applying-gausss-law'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.2.3, Applications of Gauss’s law: the infinite plane, and two parallel planes'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics: the field of an infinite flat sheet'},
    {book: 'Knight, Physics for Scientists and Engineers', where: '§27.5, Using Gauss’s law: a plane of charge (Knight writes η for σ)'},
  ],
  cases: [
    {
      key: 'sheet', label: 'Sheet',
      figure: {charge: {kind: 'sheet', size: 0, symbol: raw`\sigma`, name: 'an infinite sheet of charge'}, surface: {kind: 'pillbox', size: {min: .3, max: 1.7, initial: .9}, other: .85, label: 'Height z'}, reference: REFERENCE},
      setup: raw`An infinite flat sheet carries a charge $\sigma$ per unit area. Find the field a height $z$ above it, and compare it with the field you built from the sheet’s rings.`,
      symmetry: {
        tex: raw`\vec E=E_\perp(z)\,\hat{\mathbf n}`,
        say: raw`$\hat{\mathbf n}$ points away from the sheet on either side; $E_\perp$ is negative where the field points toward it.`,
        line: raw`Turns about its normal forbid any part along the sheet; a flip swaps its sides.`,
        caption: 'A turn about a line perpendicular to the sheet leaves it unchanged but would swing any part of the field along the sheet round, so the field is perpendicular to the sheet. Flipping the sheet over swaps its two sides, so the field is the mirror of itself: away from the sheet on both sides, or toward it on both.',
      },
      surface: {
        tex: raw`A_{\text{faces}}=2A`,
        say: raw`A pillbox across the sheet, faces of area $A$ at heights $z$ and $-z$.`,
        line: raw`A pillbox across the sheet, its two faces at heights $z$ and $-z$.`,
        caption: 'Stand a pillbox across the sheet, with two faces of area A at heights z and minus z. On each face the field is perpendicular to it and the same all over; on the side it lies along the surface.',
      },
      left: {
        tex: raw`\Phi=E_\perp A+E_\perp A+0=2E_\perp A`,
        say: raw`Both faces’ $d\vec A$ point away from the sheet, so both carry $E_\perp A$, with the same sign.`,
        line: raw`Each face carries $E_\perp A$, with the same sign; the side carries nothing.`,
        caption: 'The left side. On the top face dA points up and on the bottom face down, both away from the sheet, and the field does the same, or the opposite on both. So each face carries E_⊥ A, and the side carries nothing: two E_⊥ A in all.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=\sigma A`,
        say: raw`The pillbox cuts a disc of area $A$ out of the sheet.`,
        line: raw`Inside is a disc of sheet of area $A$, holding $\sigma A$.`,
        caption: 'The right side. The pillbox encloses the disc of sheet inside it, of area A, holding σ A, whatever the pillbox’s height.',
      },
      solve: {
        tex: raw`2E_\perp A=\frac{\sigma A}{\varepsilon_0}\;\Rightarrow\;E_\perp=\frac{\sigma}{2\varepsilon_0}`,
        answer: raw`E_\perp=\frac{\sigma}{2\varepsilon_0}`,
        say: raw`$A$ cancels, and $z$ never entered: the same field at every height.`,
        line: raw`$A$ cancels and $z$ never entered: the same field at every height.`,
        caption: 'Set the sides equal and divide by two A. The face area cancels and the height never entered, so the field is the same at every distance from the sheet: away from it for a positive σ, toward it for a negative one.',
      },
      checks: [
        {title: 'The integral agrees', text: raw`The Infinite sheet lesson added the sheet up ring by ring and found $\sigma/(2\varepsilon_0)$, which is $2\pi k\sigma$, with no $z$ in it. Gauss’s law finds the same field, without a single ring:`, tex: raw`2\pi k\sigma=\frac{2\pi\sigma}{4\pi\varepsilon_0}=\frac{\sigma}{2\varepsilon_0}`},
        {title: 'No height in it', text: raw`Drag the height: the profile under the figure stays flat. A taller box has faces farther out, but they see the same field and the box holds the same charge.`},
        {title: 'The jump across the sheet', text: raw`With $E_z$ the field’s part along the fixed upward direction, just above, $E_z=\sigma/(2\varepsilon_0)$; just below, $-\sigma/(2\varepsilon_0)$. The jump is $\sigma/\varepsilon_0$:`, tex: raw`E_z^{\text{above}}-E_z^{\text{below}}=\frac{\sigma}{\varepsilon_0}`},
      ],
    },
    {
      key: 'slab', label: 'Thick slab',
      figure: {charge: {kind: 'slab', size: .6, symbol: raw`\rho`, name: 'a thick slab of charge', bounds: ['a']}, surface: {kind: 'pillbox', size: {min: .2, max: 1.6, initial: .4}, other: .85, label: 'Height z',
        regions: [
          {name: 'inside the slab', tex: raw`E_\perp=\frac{\rho z}{\varepsilon_0}`, say: raw`Inside, the pillbox holds a block of thickness $2z$, and the field grows in step with $z$.`},
          {name: 'outside the slab', tex: raw`E_\perp=\frac{\rho a}{\varepsilon_0}`, say: raw`Outside, the pillbox holds the slab’s whole thickness $2a$, and the field is the same at every height.`},
        ]}, reference: REFERENCE},
      setup: raw`An infinite slab fills the space between $z=-a$ and $z=a$ with a uniform charge $\rho$ per unit volume. Find the field a height $z$ from its middle, inside the slab and outside it.`,
      symmetry: {
        tex: raw`\vec E=E_\perp(z)\,\hat{\mathbf n}`,
        say: raw`$\hat{\mathbf n}$ points away from the slab’s middle; $E_\perp$ depends only on the height $z$.`,
        line: raw`The slab is the same above and below its middle: the field is perpendicular to it.`,
        caption: 'Turns about a line perpendicular to the slab leave it unchanged, so the field is perpendicular to it. Flipping it over its middle leaves it unchanged too, so the field at z is the mirror of the field at minus z: away from the middle on both sides, or toward it on both.',
      },
      surface: {
        tex: raw`A_{\text{faces}}=2A`,
        say: raw`A pillbox centred on the slab’s middle, faces at $z$ and $-z$: inside the slab or outside it.`,
        line: raw`A pillbox centred on the middle, its faces at $z$ and $-z$.`,
        caption: 'Stand a pillbox centred on the slab’s middle plane, faces of area A at heights z and minus z, inside the slab or outside it.',
      },
      left: {
        tex: raw`\Phi=2E_\perp A`,
        say: raw`Both faces carry $E_\perp A$; the side carries nothing.`,
        line: raw`Both faces carry $E_\perp A$, inside the slab or out; the side, nothing.`,
        caption: 'The left side is two E_⊥ A, in either region: both faces carry E_⊥ A, the side nothing.',
      },
      right: {
        tex: raw`\begin{aligned}Q_{\text{enc}}&=\int_{-z}^{z}\rho A\,dz'\\&=2\rho Az\quad(z\le a)\\Q_{\text{enc}}&=2\rho Aa\quad(z\ge a)\end{aligned}`,
        say: raw`Slices of volume $A\,dz'$, from $-z$ to $z$: a thickness $2z$, not $z$. Outside, from $-a$ to $a$.`,
        line: raw`Inside, a block of thickness $2z$; outside, the whole thickness $2a$.`,
        caption: 'The right side. Inside the slab, add thin slices of volume A dz from minus z to z: a block of thickness two z, holding two ρ A z. Outside, the integral stops at the slab’s faces, and the pillbox holds two ρ A a.',
      },
      solve: {
        tex: raw`E_\perp=\begin{cases}\dfrac{\rho z}{\varepsilon_0}, & z\le a\\[6pt]\dfrac{\rho a}{\varepsilon_0}, & z\ge a\end{cases}`,
        answer: raw`E_\perp=\begin{cases}\dfrac{\rho z}{\varepsilon_0}, & z\le a\\[6pt]\dfrac{\rho a}{\varepsilon_0}, & z\ge a\end{cases}`,
        say: raw`The two twos cancel; so does $A$.`,
        line: raw`The twos cancel: $\rho z/\varepsilon_0$ inside, $\rho a/\varepsilon_0$ outside.`,
        caption: 'Set the sides equal and divide by two A. Inside, the field grows in step with z, from zero at the middle. Outside, it is the same at every height. Away from the slab for a positive ρ, toward it for a negative one.',
      },
      checks: [
        {title: 'Like a sheet from outside', text: raw`From outside the slab is a sheet holding $\sigma=2\rho a$ per unit area, and $\sigma/(2\varepsilon_0)=\rho a/\varepsilon_0$. Squash the slab thin keeping $2\rho a$ fixed and you have the sheet.`},
        {title: 'They meet at the face', text: raw`At $z=a$ both answers give $\rho a/\varepsilon_0$. A volume charge has no surface charge, so there is no jump.`},
        {title: 'The factor of two', text: raw`Writing $Q_{\text{enc}}=\rho Az$ forgets the half of the block below the middle, and gives half the right field. The block runs from $-z$ to $z$.`},
      ],
    },
    {
      key: 'plates', label: 'Two sheets (a capacitor)',
      figure: {charge: {kind: 'plates', size: 1.2, symbol: raw`\sigma`, name: 'two parallel sheets carrying opposite charges', bounds: ['d']}, surface: {kind: 'pillbox', size: {min: .3, max: 1.02, initial: .6}, other: .85, label: 'Height z',
        regions: [
          {name: 'between the plates', tex: raw`E_\perp=\frac{\sigma}{\varepsilon_0}`, say: raw`Between the plates the two sheets’ fields add, whatever the distance from either.`},
          {name: 'beyond both plates', tex: raw`E_\perp=0`, say: raw`Beyond both plates the two sheets’ fields cancel: no field. That comes from adding them; a pillbox reaching here encloses nothing and decides nothing.`, superposition: true},
        ]}, reference: REFERENCE},
      setup: raw`Two infinite parallel sheets a distance $d$ apart carry $\sigma$ and $-\sigma$ per unit area, the $\sigma$ plate above the $-\sigma$ one: a capacitor’s plates. Find the field between them and outside them.`,
      symmetry: {
        tex: raw`\vec E=\vec E_{\sigma}+\vec E_{-\sigma},\qquad |\vec E_{\pm\sigma}|=\frac{|\sigma|}{2\varepsilon_0}`,
        say: raw`This step is superposition, not a symmetry: each sheet alone has the Sheet case’s field, perpendicular to it and the same at every height, and the two add.`,
        line: raw`Superposition first: between, the sheets’ fields add; outside, they cancel.`,
        caption: 'Each sheet on its own makes the field of the Sheet case, perpendicular to it and the same at every height, away from the positive sheet and toward the negative one. Outside both, the two fields point opposite ways and cancel. Between them they point the same way and add.',
      },
      surface: {
        tex: raw`A_{\text{face}}=A`,
        say: raw`A pillbox round the $\sigma$ plate, one face outside the pair and one between the plates, at $-z$.`,
        line: raw`A pillbox round one plate: one face outside, one between the plates.`,
        caption: 'To check the field between the plates with Gauss’s law, stand a pillbox round the plate carrying σ: one face of area A outside the pair, where there is no field, and one between the plates, a distance z below it.',
      },
      left: {
        tex: raw`\Phi=0+E_\perp A+0=E_\perp A`,
        say: raw`The outside face sees no field and the side has $\vec E$ along it: only the face between the plates carries flux.`,
        line: raw`Only the face between the plates carries flux, $E_\perp A$.`,
        caption: 'The left side. The face outside the pair carries nothing, since there is no field there, and the side carries nothing, since the field lies along it. Only the face between the plates carries flux: E_⊥ A, with E_⊥ the field’s part along its outward normal, toward the other plate.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=\sigma A`,
        say: raw`The pillbox holds a disc of one plate, not of both.`,
        line: raw`Inside is a disc of the one plate, holding $\sigma A$.`,
        caption: 'The right side. The pillbox encloses a disc of area A of the plate carrying σ, and none of the other plate.',
      },
      solve: {
        tex: raw`E_\perp A=\frac{\sigma A}{\varepsilon_0}\;\Rightarrow\;E_\perp=\frac{\sigma}{\varepsilon_0}`,
        answer: raw`\begin{aligned}E_\perp&=\frac{\sigma}{\varepsilon_0}\ \ \text{between}\\E&=0\ \ \text{outside}\end{aligned}`,
        say: raw`Twice a lone sheet’s field, and the same as the two halves added.`,
        line: raw`$\sigma/\varepsilon_0$ between, the two halves added; nothing outside.`,
        caption: 'Divide by A. Between the plates the field is σ over ε₀, the two sheets’ halves added, the same everywhere between them, pointing from the positive plate to the negative one. Outside the pair there is none.',
        note: raw`Between the plates the field points from the $\sigma$ plate toward the $-\sigma$ one. The zero outside comes from adding the two sheets’ fields; the one-sided pillbox, which stands on it, checks the field between them. Reversing the charges reverses the field.`,
      },
      checks: [
        {title: 'Superposition agrees', text: raw`Adding the two sheets’ fields gave $\sigma/(2\varepsilon_0)+\sigma/(2\varepsilon_0)=\sigma/\varepsilon_0$ between them; the one-sided pillbox gives the same.`},
        {title: 'Why the outside needs superposition', text: raw`A pillbox standing across both plates encloses $\sigma A-\sigma A=0$, so the field outside is the same above the pair and below it. Gauss’s law cannot say how big it is: a uniform field could be added to the answer and still pass. The zero outside comes from adding the sheets’ fields.`},
        {title: 'No distance in it', text: raw`Neither $d$ nor $z$ is in the answer: the field is the same everywhere between the plates. Across each plate $E_z$, above minus below, jumps by that plate’s own charge over $\varepsilon_0$: $\sigma/\varepsilon_0$ across the top plate, which carries $\sigma$, and $-\sigma/\varepsilon_0$ across the bottom one, which carries $-\sigma$.`},
      ],
    },
  ],
  traps: [
    {wrong: 'A sheet’s field weakens with distance.', right: raw`An infinite sheet looks the same from every height, so its field cannot. A finite plate’s does, once you are far enough to see its edges.`},
    {wrong: raw`The pillbox gives $E_\perp A=\sigma A/\varepsilon_0$.`, right: raw`It has two faces, and the field crosses both: $2E_\perp A$. One face only is right when the other sees no field, as next to a conductor.`},
    {wrong: raw`Inside a slab, $Q_{\text{enc}}=\rho Az$.`, right: raw`The pillbox runs from $-z$ to $z$: $2\rho Az$.`},
    {wrong: 'A pillbox round both plates finds the field outside a capacitor.', right: raw`It encloses zero, which says only that the field outside is the same above and below, not how big. Superposition says it is zero.`},
  ],
  instrument: 'profile',
  next: 'conductors',
  related: {field: 'sheet', text: 'The same sheet, added up ring by ring'},
  alongside: {field: 'sheet', text: raw`The same $\sigma/(2\varepsilon_0)$, built ring by ring, with no height in it either`},
};
