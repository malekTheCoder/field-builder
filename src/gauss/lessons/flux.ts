import type {GaussLesson} from '../types';
const raw = String.raw;
/* FLUX, THE IDEA. The hook of the unit: flux through a flat patch (the angle measured from the normal), the
 * surface integral as a sum of patches, then a closed surface round a point charge, whose flux is q/ε₀ whatever
 * its size or shape, and zero for a charge outside. The run takes the sphere through the recipe to Φ = q/ε₀;
 * the instrument under the figure lets the reader drag charges of either sign across a closed surface and see
 * the flux change only when one crosses it. It takes on the two traps the study guide names for this step:
 * zero flux is not zero field, and a bigger surface does not catch more flux. */
export const lesson: GaussLesson = {
  id: 'flux',
  title: 'Flux, the idea',
  short: 'Flux, the idea',
  about: 'A field through a tilted patch, then through any closed surface round a point charge.',
  lead: raw`Flux measures how much field passes through a surface. Through any closed surface round a point charge $q$ it comes to $q/\varepsilon_0$, whatever the surface’s size or shape, and a charge outside adds nothing.`,
  sections: [
    {heading: 'Through a flat patch', body: [
      raw`Hold a flat patch of area $A$ in a uniform field $\vec E$. Give it an area vector $\vec A=A\,\hat{\mathbf n}$: perpendicular to the patch, its length the patch’s area. An open patch has two sides, and you choose which way $\hat{\mathbf n}$ points. The flux through it is the dot product:`,
      {tex: raw`\Phi=\vec E\cdot\vec A=EA\cos\theta`},
      raw`The charges can stay still while the flux is nonzero. Flux measures the field’s normal component weighted by area; no charge has to move through the patch. Its units are $\mathrm{N\,m^2/C}$, from electric field times area. Reversing the chosen normal reverses the flux’s sign without changing the field.`,
      raw`Here $\theta$ is the angle between $\vec E$ and the normal $\hat{\mathbf n}$, not between $\vec E$ and the patch. Only the part of the field perpendicular to the patch, $E\cos\theta$, carries field through it; the part along the patch slides past.`,
    ]},
    {heading: 'The angle is from the normal', body: [
      raw`Face the patch square on to the field, $\theta=0$, and the flux is the most it can be, $EA$. Turn it until the field slides along it, $\theta=\pi/2$, and the flux is zero. Turn it further and the field goes through the other way, and the flux is negative. If a problem gives the angle between the field and the surface itself, the angle you want is its complement.`,
    ]},
    {heading: 'Curved surfaces, changing fields', body: [
      raw`Where the surface curves or the field changes from place to place, cut the surface into small patches $d\vec A$, each nearly flat with the field nearly the same across it, and add up what each one carries:`,
      {tex: raw`\Phi=\int\vec E\cdot d\vec A`},
      raw`It is the same move as the integral lessons make with the charge: cut it into pieces, find what one piece does, add them up.`,
    ]},
    {heading: 'Round a point charge', body: [
      raw`A closed surface has an inside and an outside, and on it every $d\vec A$ points out. Field leaving counts as positive flux, field entering as negative; the circle on $\oint$ says the integral goes all the way round. Put a point charge $q$ at the centre of a sphere of radius $r$. On every patch $\vec E$ lies along $d\vec A$, with it for a positive $q$ and against it for a negative one, and has the same size, so`,
      {tex: raw`\oint\vec E\cdot d\vec A=\frac{q}{4\pi\varepsilon_0r^2}\,(4\pi r^2)=\frac{q}{\varepsilon_0}`},
      raw`The $r^2$ cancels. The field weakens as $1/r^2$ while the area grows as $r^2$, so every sphere round $q$ carries the same flux.`,
    ]},
    {heading: 'Any shape, any size', body: [
      raw`Now make the surface lumpy. Seen from $q$, each patch fills a narrow cone. A patch farther out along the same cone is bigger, by exactly the factor the field is weaker, and a patch tilted to the cone is bigger again, by exactly the factor its tilt takes off. So cones of the same opening carry the same flux whatever patch they end on; a cone that crosses a fold of the surface out, in and out again nets one crossing. The cones together carry $q/\varepsilon_0$ through any closed surface round $q$.`,
    ]},
    {heading: 'A charge outside', body: [
      raw`For a charge outside the surface, every cone that enters the surface leaves it again. Its crossings come in inward and outward pairs, each carrying equal flux of opposite sign. Even a folded surface, with several such pairs, has zero net flux from that charge. With many charges the fields add, so the fluxes add: each charge inside gives its own $q_i/\varepsilon_0$, and each charge outside gives nothing. That is Gauss’s law:`,
      {tex: raw`\oint\vec E\cdot d\vec A=\frac{Q_{\text{enc}}}{\varepsilon_0}`},
    ]},
    {heading: 'Two traps', body: [
      raw`Zero flux does not mean zero field. A charge outside the surface makes a field at every point of it; the field goes in on one side and out on the other, and only the net flux is zero. And a bigger surface does not catch more flux: with the same charge inside, every surface carries the same flux, which is why the readout under the figure changes only when a charge crosses the dashed line.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§6.1, Electric Flux', url: 'https://openstax.org/books/university-physics-volume-2/pages/6-1-electric-flux'},
    {book: 'OpenStax, University Physics Volume 2', where: '§6.2, Explaining Gauss’s Law', url: 'https://openstax.org/books/university-physics-volume-2/pages/6-2-explaining-gausss-law'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.2, Divergence and curl of electrostatic fields: field lines, flux and Gauss’s law'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics: flux and Gauss’s law'},
    {book: 'Knight, Physics for Scientists and Engineers', where: '§27.2 and §27.3, The concept of flux, and calculating electric flux'},
  ],
  cases: [
    {
      key: 'point', label: 'Point charge',
      figure: {charge: {kind: 'point', size: 0, symbol: 'q', name: 'a point charge'}, surface: {kind: 'sphere', size: {min: .75, max: 2.8, initial: 1.7}, other: 0, label: 'Radius r'}},
      setup: raw`A point charge $q$ sits at the centre of a sphere of radius $r$. Find the flux $\Phi$ of its field out through the sphere.`,
      symmetry: {
        tex: raw`\vec E=\frac{q}{4\pi\varepsilon_0r^2}\,\hat{\mathbf r}`,
        say: raw`Coulomb’s law. For a negative $q$ this points in, toward the charge.`,
        line: raw`Coulomb’s law: on the sphere $\vec E$ is radial and the same size everywhere.`,
        caption: 'By Coulomb’s law the field of a point charge points along the radius, out for a positive charge and in for a negative one, and at the same distance it has the same size. On a sphere centred on the charge that is every point.',
      },
      surface: {
        tex: raw`A=4\pi r^2`,
        say: raw`The sphere cut into patches, each with its outward $d\vec A$: on every patch, $d\vec A$ lies along the radius, as $\vec E$ does.`,
        line: raw`Cut the sphere into patches, each with its outward $d\vec A$ along the radius.`,
        caption: 'Cut the sphere into patches. Each has its area vector dA, pointing straight out, along the radius, the same line the field lies on.',
      },
      left: {
        tex: raw`\Phi=\oint\vec E\cdot d\vec A=\frac{q}{4\pi\varepsilon_0r^2}\,(4\pi r^2)`,
        say: raw`On each patch $\vec E\cdot d\vec A=E_r\,dA$, which has the sign of $q$, and $E_r$ is the same on every patch, so the patches add to the whole area.`,
        line: raw`Each patch carries $E_r\,dA$, so the flux is $E_r$ times the whole area.`,
        caption: 'The left side. On every patch the dot product is E_r times the patch’s area, with the sign of q, so adding the patches adds their areas: E_r times four π r squared.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=q`,
        say: raw`The one charge there is sits inside.`,
        line: raw`The charge inside the sphere is $q$ itself.`,
        caption: 'The right side. The only charge there is, q, is inside the sphere.',
      },
      solve: {
        tex: raw`\Phi=\frac{q}{\varepsilon_0}=\frac{Q_{\text{enc}}}{\varepsilon_0}`,
        answer: raw`\Phi=\frac{q}{\varepsilon_0}`,
        say: raw`The $r^2$ cancels: the field weakens as $1/r^2$ exactly as the area grows as $r^2$.`,
        line: raw`The $r^2$ cancels: every sphere round $q$ carries the same flux, $q/\varepsilon_0$.`,
        caption: 'The r squared cancels. The field weakens as one over r squared exactly as the area grows as r squared, so every sphere round q carries the same flux, q over ε₀: positive, net outward, for a positive q; negative, net inward, for a negative one.',
      },
      checks: [
        {title: 'No radius in it', text: raw`Drag the radius and nothing in the answer moves: there is no $r$ in $q/\varepsilon_0$. A bigger sphere is crossed by a weaker field over a larger area, and the two exactly trade off.`},
        {title: 'Any shape', text: raw`The instrument under the figure draws a lumpy surface instead of a sphere. Its flux is the sum of $q_i/\varepsilon_0$ over the charges it encloses, and it changes only when a charge crosses it.`},
        {title: 'A charge outside', text: raw`A charge outside a closed surface puts flux in on one side and takes the same flux out on the other: it adds zero to the net flux, though its field is not zero anywhere on the surface.`},
        {title: 'Units', text: raw`$q/\varepsilon_0$ is in $\mathrm{N\,m^2/C}$: a field, in $\mathrm{N/C}$, times an area.`},
      ],
    },
  ],
  traps: [
    {wrong: 'Zero flux means zero field on the surface.', right: raw`Zero net flux says only that the charge inside adds to zero. A charge outside makes a field all over the surface; it goes in on one side and out on the other.`},
    {wrong: 'A bigger surface has more flux.', right: raw`The same charge inside gives the same flux whatever the size or shape: the field weakens exactly as the area grows.`},
    {wrong: raw`The angle in $EA\cos\theta$ is measured from the surface.`, right: raw`From the normal. A field lying along the surface carries nothing, and $\cos(\pi/2)=0$ says so.`},
    {wrong: 'The field in Gauss’s law is only the field of the charge inside.', right: raw`$\vec E$ is the whole field, from every charge. The charges outside add nothing to the net flux, but they do add to the field on the surface.`},
  ],
  instrument: 'flux',
  next: 'inside',
  related: {field: 'sheet', text: 'Built the long way, ring by ring: a field the Sheets and slabs lesson gets in two lines'},
};
