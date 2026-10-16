import type {GaussLesson} from '../types';
const raw = String.raw;
/* SYMMETRY FIRST. The owner's study guide opens the unit here, before any flux, and so does the site: Gauss's
 * law is true for every closed surface, but it hands over E only where symmetry has already said which way E
 * points and where its size is the same. The argument is the rotate-and-flip one: a move that leaves the charge
 * as it was cannot change the field it makes. The three cases are the three usable symmetries, and the run
 * follows whichever one the reader has picked, taking it through the whole recipe to the field. Every sentence
 * holds for either sign: E_r and E_⊥ are signed components, negative where the field points in. */
export const lesson: GaussLesson = {
  id: 'symmetry',
  title: 'Symmetry first',
  short: 'Symmetry first',
  about: 'Why a sphere’s, a line’s and a plane’s fields must point straight out or straight in, before any calculation.',
  lead: raw`Before any calculation, the shape of the charge decides the shape of its field. A turn or a flip that leaves the charge exactly as it was must leave its field as it was too, and that alone says which way the field points.`,
  sections: [
    {heading: 'Why symmetry comes first', body: [
      raw`Gauss’s law says that the flux of $\vec E$ out through any closed surface is the charge inside divided by $\varepsilon_0$:`,
      {tex: raw`\oint\vec E\cdot d\vec A=\frac{Q_{\text{enc}}}{\varepsilon_0}`},
      raw`It is true for every surface and every charge. But it gives you $\vec E$ only when $\vec E$ can come out of the integral, and that needs a surface on which you already know which way $\vec E$ points and where its size is the same. Only symmetry can tell you that, and it has to tell you before you calculate anything.`,
    ]},
    {heading: 'The rule', body: [
      raw`Some moves leave a charge looking exactly as it was: turning it about an axis, flipping it in a mirror, sliding it along itself. The field is made by the charge and nothing else. So if a move leaves the charge unchanged, it must leave the field unchanged too; otherwise the field could tell apart two charges that are identical. The field has every symmetry the charge has.`,
    ]},
    {heading: 'A long straight line', body: [
      raw`Take an infinite line with a uniform charge $\lambda$ per unit length, and a point $P$ off it. Suppose the field at $P$ had a part along the line. Flip everything in a mirror square to the line, through $P$: the line is unchanged, but that part now points the other way. Same charge, different field, so there is no such part.`,
      raw`Suppose instead the field had a part going round the line, a swirl. Flip in a mirror that contains the line and $P$: the line is unchanged and the swirl reverses. No swirl either. What is left points straight out from the line, or straight in where $\lambda$ is negative. Turning about the line and sliding along it change nothing, so the field’s size can depend only on the distance $r$ from the line:`,
      {tex: raw`\vec E=E_r(r)\,\hat{\mathbf r}`},
      raw`Here $\hat{\mathbf r}$ points straight out from the line and $E_r$ is the field’s part along it, which comes out negative where the field points in. This needs the line to be infinite: for a finite rod, the flip square to it through $P$ does not leave the rod unchanged unless $P$ is level with its middle, and away from there the field leans.`,
    ]},
    {heading: 'A sphere and a plane', body: [
      raw`A charge that depends only on the distance from a centre is unchanged by any turn about that centre. A part of $\vec E$ across the radius at $P$ would be swung round by a turn about the radius through $P$, while the charge stays put, so $\vec E$ points along the radius, and its size depends only on $r$.`,
      raw`An infinite sheet with a uniform $\sigma$ is unchanged by a turn about the line through $P$ square to it. Such a turn swings any part of $\vec E$ along the sheet round, so there is none: $\vec E$ is square to the sheet. And a mirror in the sheet’s own plane leaves the sheet as it was and swaps its two sides, so the field below is the mirror of the field above: away from the sheet on both sides, or toward it on both.`,
    ]},
    {heading: 'The three usable symmetries', body: [
      raw`Spherical: the charge depends only on the distance from a point. $\vec E$ is radial; draw a sphere about the centre. Cylindrical: the charge depends only on the distance from an axis, and goes on for ever along it. $\vec E$ points straight out from the axis; draw a cylinder about it. Planar: the charge depends only on the height above an infinite plane, and is the same at equal heights above and below it. $\vec E$ is square to the plane; draw a pillbox standing across it.`,
      {tex: raw`\text{sphere: }\ 4\pi r^2E_r\qquad\text{cylinder: }\ 2\pi rL\,E_r\qquad\text{pillbox: }\ 2AE_\perp`},
      raw`Those are what the left side of Gauss’s law becomes on each surface. Symmetry gives the shape of the field, never its strength; Gauss’s law supplies the strength.`,
    ]},
    {heading: 'What makes a surface useful', body: [
      raw`Each part of the surface has to be one of three kinds. On one kind, $\vec E$ is square to the surface and the same size all over, and the part contributes the field’s signed component along its outward normal, $E_r$ or $E_\perp$, times its area. On another, $\vec E$ lies along the surface, and the part contributes nothing. On the last, $\vec E$ is zero, and it contributes nothing either. The surface must also pass through the point where you want the field. It does not have to enclose all the charge: round an infinite line or sheet it only ever encloses a sample.`,
    ]},
    {heading: 'When it only looks symmetric', body: [
      raw`Shapes that look just as neat, a rod with ends, a charged cube, a plate with edges, survive too few of those moves. Whatever closed surface you draw around one, its field is somewhere slanted to it or stronger in one place than another. The flux through that surface is still the enclosed charge over $\varepsilon_0$; what you cannot do is pull $\vec E$ out of the integral. For them the field comes from adding up the pieces, as the integral lessons do.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§6.3, Applying Gauss’s Law: symmetry and the choice of surface', url: 'https://openstax.org/books/university-physics-volume-2/pages/6-3-applying-gausss-law'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.2, Divergence and curl of electrostatic fields: applications of Gauss’s law'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics: Gauss’s law and its uses'},
  ],
  cases: [
    {
      key: 'sphere', label: 'Sphere',
      figure: {charge: {kind: 'ball', size: 1, symbol: 'Q', name: 'a uniformly charged ball'}, surface: {kind: 'sphere', size: {min: 1.35, max: 3, initial: 2.1}, other: 0, label: 'Radius r'}},
      setup: raw`A ball of radius $R$ carries a charge $Q$ spread evenly through it. Find the field at a point $P$ a distance $r$ from its centre, outside the ball, where $r>R$.`,
      symmetry: {
        tex: raw`\vec E=E_r(r)\,\hat{\mathbf r}`,
        say: raw`$E_r$ is the part of $\vec E$ along $\hat{\mathbf r}$, outward from the centre: negative where the field points in.`,
        line: raw`Any turn about the centre leaves the ball as it was, so $\vec E$ is radial.`,
        caption: 'Any turn about the centre leaves the ball exactly as it was, so it must leave the field as it was. A part of E across the radius would be swung round by a turn about the radius, so there is none: E points along the radius, and its size can depend only on the distance r from the centre.',
      },
      surface: {
        tex: raw`A=4\pi r^2`,
        say: raw`A sphere of radius $r$ through $P$, centred on the ball: $\vec E$ is square to every patch, with the same $E_r$ on all of them.`,
        line: raw`A sphere through $P$, centred on the ball: $\vec E$ is square to every patch.`,
        caption: 'Draw a sphere of radius r through P, centred on the ball. On every patch of it the field points along the outward normal, or against it for a negative charge, and has the same size, since every patch is the same distance from the centre.',
      },
      left: {
        tex: raw`\Phi=\oint\vec E\cdot d\vec A=E_r\,(4\pi r^2)`,
        say: raw`Each patch carries $E_r\,dA$, and $E_r$ is the same on all of them, so adding the patches adds their areas.`,
        line: raw`Each patch carries $E_r\,dA$; adding them adds the areas, to $4\pi r^2$.`,
        caption: 'The left side. Each patch carries E_r times its area, and E_r is the same on every patch, so it comes out of the sum: the flux is E_r times the whole area of the sphere, four π r squared.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=Q`,
        say: raw`The whole ball is inside the sphere.`,
        line: raw`The whole ball is inside the sphere, so the charge inside is all of $Q$.`,
        caption: 'The right side. The ball lies wholly inside the sphere, so all of its charge Q is enclosed.',
      },
      solve: {
        tex: raw`E_r\,(4\pi r^2)=\frac{Q}{\varepsilon_0}\;\Rightarrow\;E_r=\frac{Q}{4\pi\varepsilon_0 r^2}`,
        answer: raw`E_r=\frac{Q}{4\pi\varepsilon_0r^2}=\frac{kQ}{r^2}`,
        say: raw`Outside, the ball’s field is a point charge’s, as if all of $Q$ sat at the centre.`,
        line: raw`Set the two sides equal and divide by the area: a point charge’s field.`,
        caption: 'Set the two sides equal and divide by the area. Outside the ball its field is exactly a point charge’s, as if all of Q sat at the centre: pointing out for positive Q, in for negative.',
      },
      checks: [
        {title: 'Like a point charge', text: raw`The answer has no $R$ in it: outside, any ball of charge $Q$, however big, makes the field of a point charge $Q$ at its centre. Coulomb’s law comes back out of Gauss’s law.`},
        {title: 'At the surface', text: raw`At $r=R$ it gives $E_r=Q/(4\pi\varepsilon_0R^2)$, the field just outside the ball. Inside, the sphere encloses only part of the ball, and the Spheres lesson takes the same sphere in to find how the field falls to zero at the centre.`},
        {title: 'Either sign', text: raw`For a negative $Q$, $E_r$ is negative and the field points in, toward the centre. Nothing in the argument used the sign.`},
      ],
    },
    {
      key: 'line', label: 'Line',
      figure: {charge: {kind: 'line', size: 0, symbol: raw`\lambda`, name: 'an infinite line of charge'}, surface: {kind: 'cylinder', size: {min: .6, max: 2.4, initial: 1.4}, other: 1.1, label: 'Radius r'}},
      setup: raw`An infinite straight line carries a charge $\lambda$ per unit length. Find the field at a point $P$ a distance $r$ from the line.`,
      symmetry: {
        tex: raw`\vec E=E_r(r)\,\hat{\mathbf r}`,
        say: raw`$\hat{\mathbf r}$ points straight out from the line; $E_r$ is negative where the field points in.`,
        line: raw`Flips that leave the line unchanged forbid any part along it or round it.`,
        caption: 'A flip in a mirror square to the line leaves the line unchanged but would reverse any part of E along it, so there is none. A flip in a mirror containing the line would reverse any swirl round it, so there is none. E points straight out from the line, and its size depends only on the distance r.',
      },
      surface: {
        tex: raw`A_{\text{wall}}=2\pi rL`,
        say: raw`A cylinder of radius $r$ and length $L$ round the line, through $P$. On its wall $\vec E$ is square to every patch and the same all over; on its two ends $\vec E$ lies along the surface.`,
        line: raw`A cylinder round the line, through $P$: $\vec E$ is square to its wall, along its ends.`,
        caption: 'Draw a cylinder of radius r and length L round the line, through P. On the curved wall the field is square to every patch and the same size all over. On the two flat ends the field lies along the surface, so they light up as patches that carry nothing.',
      },
      left: {
        tex: raw`\Phi=\oint\vec E\cdot d\vec A=E_r\,(2\pi rL)+0+0`,
        say: raw`The wall carries $E_r$ times its area; each end carries nothing, since $\vec E\cdot d\vec A=0$ there.`,
        line: raw`The wall carries $E_r$ times its area; the ends carry nothing.`,
        caption: 'The left side. The wall carries E_r times its area, two π r L. The ends carry nothing: there E lies along the surface, square to dA, and E·dA is zero on every one of their patches.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=\lambda L`,
        say: raw`Only the length $L$ of line inside the cylinder counts.`,
        line: raw`Only the length $L$ of line inside the cylinder counts: $\lambda L$.`,
        caption: 'The right side. The cylinder encloses only the length L of the line that runs through it, which holds a charge λL. The rest of the line, outside, puts no net flux through the surface, though it is what makes the field the same all along the wall.',
      },
      solve: {
        tex: raw`E_r\,(2\pi rL)=\frac{\lambda L}{\varepsilon_0}\;\Rightarrow\;E_r=\frac{\lambda}{2\pi\varepsilon_0 r}`,
        answer: raw`E_r=\frac{\lambda}{2\pi\varepsilon_0r}=\frac{2k\lambda}{r}`,
        say: raw`$L$ cancels, as it must: the cylinder is imaginary, and the field cannot depend on its length.`,
        line: raw`Set them equal: $L$ cancels, and $E_r$ falls as $1/r$.`,
        caption: 'Set the two sides equal and divide. The length L cancels, as it must, since the cylinder is imaginary. The field falls as one over r, and points out from the line for positive λ, in for negative.',
      },
      checks: [
        {title: 'The integral agrees', text: raw`The Infinite line lesson built $E_r=2k\lambda/r$ by adding the line’s pieces one by one. Gauss’s law gets the same field in two lines, because symmetry did the work the cancelling pairs did there.`},
        {title: 'The length cancels', text: raw`$L$ is gone from the answer. An $L$ left in $E$ would mean the field depended on an imaginary surface, which is always an algebra slip.`},
        {title: 'Slower than a point', text: raw`The field falls as $1/r$, more slowly than a point charge’s $1/r^2$: farther out, a cylinder of the same length still encloses the same charge, but its wall grows only as $r$.`},
      ],
    },
    {
      key: 'plane', label: 'Plane',
      figure: {charge: {kind: 'sheet', size: 0, symbol: raw`\sigma`, name: 'an infinite sheet of charge'}, surface: {kind: 'pillbox', size: {min: .35, max: 1.7, initial: .9}, other: .85, label: 'Height z'}},
      setup: raw`An infinite flat sheet carries a charge $\sigma$ per unit area. Find the field at a point $P$ a height $z$ above it.`,
      symmetry: {
        tex: raw`\vec E=E_\perp\,\hat{\mathbf n}`,
        say: raw`$\hat{\mathbf n}$ points away from the sheet on either side; $E_\perp$ is negative where the field points toward it.`,
        line: raw`Turns about a line square to the sheet forbid any part along it.`,
        caption: 'A turn about the line through P square to the sheet leaves the sheet unchanged but would swing any part of E along the sheet round, so there is none: E is square to the sheet. A mirror in the sheet’s own plane leaves it unchanged and swaps its sides, so the field points away from it on both sides, or toward it on both.',
      },
      surface: {
        tex: raw`A_{\text{faces}}=2A`,
        say: raw`A pillbox standing across the sheet, its two faces of area $A$ at heights $z$ and $-z$. On each face $\vec E$ is square to it and the same all over; on the side $\vec E$ lies along the surface.`,
        line: raw`A pillbox across the sheet: $\vec E$ is square to its faces, along its side.`,
        caption: 'Draw a pillbox standing across the sheet, with its two faces, each of area A, at heights z and minus z. On each face the field is square to it and the same size all over. On the side the field lies along the surface, so its patches light up as carrying nothing.',
      },
      left: {
        tex: raw`\Phi=\oint\vec E\cdot d\vec A=E_\perp A+E_\perp A+0=2E_\perp A`,
        say: raw`On each face $d\vec A$ points away from the sheet, along $\hat{\mathbf n}$, so each face carries $E_\perp A$. The side carries nothing.`,
        line: raw`Each face carries $E_\perp A$; the side carries nothing.`,
        caption: 'The left side. On both faces dA points away from the sheet, upward on top and downward below, so each face carries E_⊥ times A, whichever way E points. The side carries nothing.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=\sigma A`,
        say: raw`The pillbox cuts a patch of area $A$ out of the sheet.`,
        line: raw`The pillbox cuts out a patch of sheet of area $A$: $\sigma A$.`,
        caption: 'The right side. The pillbox encloses the patch of sheet inside it, of area A, which holds a charge σA.',
      },
      solve: {
        tex: raw`2E_\perp A=\frac{\sigma A}{\varepsilon_0}\;\Rightarrow\;E_\perp=\frac{\sigma}{2\varepsilon_0}`,
        answer: raw`E_\perp=\frac{\sigma}{2\varepsilon_0}`,
        say: raw`$A$ cancels, and so does $z$: the field is the same at every height.`,
        line: raw`Set them equal: $A$ cancels, and the answer has no $z$ in it.`,
        caption: 'Set the two sides equal and divide. The face area A cancels, and the height z never entered: the field is the same at every height, pointing away from the sheet for positive σ and toward it for negative.',
      },
      checks: [
        {title: 'The integral agrees', text: raw`The Infinite sheet lesson added the sheet up ring by ring and found $\sigma/(2\varepsilon_0)$, with no $z$ in it either. Here the pillbox’s height drops out because its faces see the same field wherever they are.`},
        {title: 'The jump across the sheet', text: raw`Just above the sheet $E_z=\sigma/(2\varepsilon_0)$; just below, $E_z=-\sigma/(2\varepsilon_0)$. Across a surface charge the field’s part square to it jumps by $\sigma/\varepsilon_0$:`, tex: raw`E_z^{\text{above}}-E_z^{\text{below}}=\frac{\sigma}{\varepsilon_0}`},
        {title: 'The missing two', text: raw`Forgetting the second face gives $E_\perp A=\sigma A/\varepsilon_0$ and twice the right field. The pillbox has two faces, and the field crosses both.`},
      ],
    },
  ],
  traps: [
    {wrong: 'Symmetric-looking is enough.', right: raw`A finite rod, a cube or a finite plate looks tidy, but on no surface is $\vec E$ the same and square to it all over. Gauss’s law holds for them; it just will not give you $\vec E$.`},
    {wrong: 'Symmetry gives the field’s size.', right: raw`It gives the direction, and where the size is the same. Gauss’s law gives the size.`},
    {wrong: 'The surface has to enclose all the charge.', right: raw`It has to pass through $P$. Round an infinite line or sheet it can only ever enclose a sample, and the field still comes out.`},
  ],
  instrument: 'symmetry',
  next: 'flux',
  related: {field: 'infinite', text: 'The same line, added up piece by piece'},
};
