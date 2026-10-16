import type {GaussLesson} from '../types';
const raw = String.raw;
/* WHY ONLY THE CHARGE INSIDE. The argument behind Gauss's law, in the study guide's four steps: a sphere centred on
 * a point charge; any surface round it, by the solid angle each patch fills seen from the charge; a charge outside,
 * whose every cone crosses the surface twice, in and out, and cancels; many charges, by superposition. Then the
 * misconception it sets up: E in the law is the total field. Outside charges add nothing to the net flux, but they
 * do add to the field, as a capacitor's other plate does at a pillbox round one plate.
 *
 * The three cases are the first three steps. The off-centre and outside ones have no symmetry about the sphere's
 * centre, so their run ends on a flux, not a field, and the figure's patches each carry their exact flux (physics.ts,
 * bandFlux). The instrument carries a charge out of a sphere and stacks the flux of each band. Every sentence holds
 * for either sign. */
export const lesson: GaussLesson = {
  id: 'inside',
  title: 'Why only the charge inside',
  short: 'Only the charge inside',
  about: 'A sphere, then any shape, then a charge outside, then many charges at once.',
  lead: raw`Gauss’s law counts only the charge inside the surface, though the field in it is the whole field. Four steps show why: a sphere round a point charge, any surface round it, a charge outside, and many charges at once.`,
  sections: [
    {heading: 'Step one: a sphere round the charge', body: [
      raw`Put a point charge $q$ at the centre of a sphere of radius $r$. Its field on the sphere points along the radius and has the same size everywhere, so the flux is the field’s outward part times the whole area, and the $r^2$ cancels:`,
      {tex: raw`\oint\vec E\cdot d\vec A=\frac{q}{4\pi\varepsilon_0r^2}\,(4\pi r^2)=\frac{q}{\varepsilon_0}`},
      raw`Every sphere centred on $q$, large or small, carries the same flux. That much the Flux lesson showed. The rest of the argument removes the two things it leaned on: that the surface is a sphere, and that the charge sits at its centre.`,
    ]},
    {heading: 'Step two: any surface round it', body: [
      raw`Move the charge off the centre, or squash the sphere into any closed shape. Now the field differs from patch to patch, and crosses each at its own angle. Look at the surface from $q$ instead, and measure each patch by the solid angle it fills. A solid angle is the three-dimensional version of an angle: the area a cone cuts from a sphere of radius one round its tip, $4\pi$ for every direction at once. The same cone cuts four times the area at twice the distance, which is why $dA/s^2$ appears; and a patch tilted to the cone needs more area to fill it, so it counts only $dA\cos\alpha$. A small patch $dA$ at a distance $s$ from $q$, its normal at an angle $\alpha$ to the line from $q$, fills a narrow cone of directions: its solid angle is $d\Omega=dA\cos\alpha/s^2$. The flux through it is the field’s part along its normal times its area:`,
      {tex: raw`d\Phi=\frac{q}{4\pi\varepsilon_0s^2}\,dA\cos\alpha=\frac{q}{4\pi\varepsilon_0}\,d\Omega`},
      raw`The distance and the tilt have dropped out together. A farther patch sees a weaker field but needs more area to fill the same cone; a tilted patch catches less of the field but has more area for the same cone. So a patch carries flux in proportion to the cone it fills, seen from $q$, and nothing else about it matters. A closed surface round $q$ fills every direction once, the whole solid angle $4\pi$, so its flux is $q/\varepsilon_0$ whatever its shape and wherever inside it the charge sits. Where a cone crosses a fold of the surface three times, out, in and out again, two of the crossings cancel and one is left.`,
    ]},
    {heading: 'Step three: a charge outside', body: [
      raw`Now put $q$ outside the surface. Every cone from $q$ that meets the surface enters it somewhere and leaves it somewhere else. Where it enters, the line from $q$ runs against the outward normal, and the patch carries $-q\,d\Omega/4\pi\varepsilon_0$; where it leaves, the patch carries $+q\,d\Omega/4\pi\varepsilon_0$, for the same cone. The two crossings cancel, cone by cone, and the net flux of a charge outside is zero.`,
      raw`Its field on the surface is not zero. For a positive $q$ it goes in through the side facing $q$ and out through the far side, and the other way for a negative one; only the total comes to nothing. Zero net flux says the charge inside adds to zero; it says nothing about the field.`,
    ]},
    {heading: 'Step four: many charges', body: [
      raw`Fields add, so fluxes add. With charges $q_1,q_2,\ldots$ the field is $\vec E=\vec E_1+\vec E_2+\cdots$, and the flux of a sum is the sum of the fluxes. Each charge inside gives its own $q_i/\varepsilon_0$, and each charge outside gives nothing:`,
      {tex: raw`\oint\vec E\cdot d\vec A=\sum_i\oint\vec E_i\cdot d\vec A=\frac{1}{\varepsilon_0}\sum_{\text{inside}}q_i=\frac{Q_{\text{enc}}}{\varepsilon_0}`},
      raw`Charge spread through a line, a surface or a volume is many small charges, so the same holds for it: only the part inside the surface counts.`,
    ]},
    {heading: 'The field in the law is the whole field', body: [
      raw`The right side counts only the charge inside, but the $\vec E$ on the left is the total field, made by every charge there is. Charges outside drop out of the flux, not out of the field.`,
      raw`Take a parallel-plate capacitor, one plate carrying $\sigma$ and the other $-\sigma$, and stand a pillbox across the first plate. The second plate is outside the pillbox and adds nothing to its net flux. It does add to the field: on the face between the plates the two fields add to $\sigma/\varepsilon_0$, and on the face outside they cancel to zero. The flux is still $\sigma A/\varepsilon_0$, all of it through the inner face. For a lone sheet the two faces see equal fields, which is what gave $2E_\perp A$; here the other plate breaks that symmetry, and taking the field at each face to be the plate’s own $\sigma/2\varepsilon_0$ would be wrong on both faces.`,
    ]},
    {heading: 'Why the symmetric problems work', body: [
      raw`In the lessons that follow, the right side counts only the charge inside, and yet the answer is the whole field. Why that works depends on the shape. Round a ball, the charge outside a Gaussian sphere is a set of shells, and a uniform shell makes no field anywhere inside it: there the charge outside really does add nothing to the field on the surface.`,
      raw`Round an infinite line or sheet it is different. The rest of the line outside the cylinder, or of the sheet outside the pillbox, does make field on the surface, most of it when the cylinder is short or the pillbox narrow. It puts no net flux through the surface, and it is what makes the field the same all over the wall or face, which is why $E$ can come out of the integral. The answer is the whole line’s or sheet’s field, not the field of the piece inside. Where charge outside breaks the symmetry, the law still holds, but the field no longer comes out of the integral.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§6.2, Explaining Gauss’s Law: any surface, and a charge outside', url: 'https://openstax.org/books/university-physics-volume-2/pages/6-2-explaining-gausss-law'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.2.1, Field lines, flux and Gauss’s law: the argument by solid angle'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics: Gauss’s law, any surface and any charges'},
    {book: 'Knight, Physics for Scientists and Engineers', where: '§27.4, Gauss’s law: any surface, and charge outside'},
  ],
  cases: [
    {
      key: 'centred', label: 'Charge at the centre',
      figure: {charge: {kind: 'point', size: 0, symbol: 'q', name: 'a point charge at the centre'}, surface: {kind: 'sphere', size: {min: .75, max: 2.6, initial: 1.7}, other: 0, label: 'Radius r'}},
      setup: raw`Step one. A point charge $q$ sits at the centre of a sphere of radius $r$. Find the flux $\Phi$ out through the sphere.`,
      symmetry: {
        tex: raw`\vec E=\frac{q}{4\pi\varepsilon_0r^2}\,\hat{\mathbf r}`,
        say: raw`Coulomb’s law: along the radius, out for a positive $q$ and in for a negative one, the same size at every point of the sphere.`,
        line: raw`At the centre, $q$’s field is radial and the same size all over the sphere.`,
        caption: 'With the charge at the centre, its field points along the radius at every point of the sphere, out for a positive charge and in for a negative one, and has the same size all over it.',
      },
      surface: {
        tex: raw`A=4\pi r^2`,
        say: raw`Each patch’s outward $d\vec A$ lies along the radius, on the same line as $\vec E$.`,
        line: raw`Every patch has its outward $d\vec A$ along the radius, as $\vec E$ is.`,
        caption: 'Cut the sphere into patches. Each one’s outward area vector dA points along the radius, on the same line as the field.',
      },
      left: {
        tex: raw`\Phi=E_r\,(4\pi r^2)=\frac{q}{4\pi\varepsilon_0r^2}\,(4\pi r^2)`,
        say: raw`$E_r$ is the same on every patch, so adding the patches adds their areas.`,
        line: raw`The field is the same on every patch: the flux is $E_r$ times the area.`,
        caption: 'The left side. Every patch carries E_r times its area, with the sign of q, and E_r is the same on all of them: the flux is E_r times four π r squared.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=q`,
        say: raw`The one charge there is sits inside.`,
        line: raw`The charge inside the sphere is $q$ itself.`,
        caption: 'The right side. The only charge, q, is inside the sphere.',
      },
      solve: {
        tex: raw`\Phi=\frac{q}{\varepsilon_0}=\frac{Q_{\text{enc}}}{\varepsilon_0}`,
        answer: raw`\Phi=\frac{q}{\varepsilon_0}`,
        say: raw`The $r^2$ cancels. Seen from the centre, the sphere fills every direction once, the whole solid angle $4\pi$.`,
        line: raw`The $r^2$ cancels: any sphere centred on $q$ carries $q/\varepsilon_0$.`,
        caption: 'The r squared cancels, so every sphere centred on q carries the same flux, q over ε₀: positive for a positive q, negative for a negative one. The next case moves the charge off the centre.',
      },
      checks: [
        {title: 'No radius in it', text: raw`Drag the radius: nothing in $q/\varepsilon_0$ moves. The field weakens as $1/r^2$ exactly as the area grows as $r^2$.`},
        {title: 'Either sign', text: raw`For a negative $q$ every patch carries flux in, and $\Phi=q/\varepsilon_0$ is negative. Nothing in the argument used the sign.`},
      ],
    },
    {
      key: 'off', label: 'Charge off centre',
      figure: {charge: {kind: 'offset', size: .8, symbol: 'q', name: 'a point charge off the centre'}, surface: {kind: 'sphere', size: {min: 1.25, max: 2.6, initial: 1.7}, other: 0, label: 'Radius r'}},
      setup: raw`Step two. A point charge $q$ sits inside a sphere of radius $r$, but not at its centre. Find the flux $\Phi$ out through the sphere.`,
      symmetry: {
        tex: raw`\vec E=\frac{q}{4\pi\varepsilon_0s^2}\,\hat{\mathbf s}`,
        say: raw`$s$ is the distance from $q$, and $\hat{\mathbf s}$ points away from it. The field is radial from $q$, not from the sphere’s centre.`,
        line: raw`The field is radial from $q$, not from the centre, so it differs from patch to patch.`,
        caption: 'The field is a point charge’s: pointing straight away from q, or toward it for a negative charge, and weaker farther from it. About the sphere’s centre it has no symmetry, so on each patch it has a different size and crosses at a different angle.',
      },
      surface: {
        tex: raw`d\Phi=E_s\,dA\cos\alpha`,
        say: raw`The sphere, cut into patches. On each, $\alpha$ is the angle between the line from $q$ and the outward $d\vec A$, and $E_s=q/4\pi\varepsilon_0s^2$ is the field’s part along that line, of $q$’s sign.`,
        line: raw`Cut the sphere into patches: each is tilted at its own angle $\alpha$ to the line from $q$.`,
        caption: 'Cut the sphere into patches, each with its outward area vector dA. Each is tilted at its own angle α to the line from q, and the field there has its own strength, so no one number can come out of the integral.',
      },
      left: {
        tex: raw`\Phi=\oint\frac{q}{4\pi\varepsilon_0}\,\frac{dA\cos\alpha}{s^2}=\frac{q}{4\pi\varepsilon_0}\oint d\Omega`,
        say: raw`$dA\cos\alpha/s^2$ is $d\Omega$, the solid angle the patch fills, seen from $q$: its distance and its tilt drop out together.`,
        line: raw`Each patch carries $q/4\pi\varepsilon_0$ times the solid angle it fills, seen from $q$.`,
        caption: 'The left side. A patch farther from q sees a weaker field but fills the same cone with more area; a tilted patch catches less of the field but has more area for the same cone. So each patch carries q over four π ε₀ times the solid angle it fills, seen from q, and nothing else about it matters.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=q`,
        say: raw`The charge is inside the sphere, wherever in it.`,
        line: raw`The charge is inside the sphere, wherever in it: $Q_{\text{enc}}=q$.`,
        caption: 'The right side. The charge q is inside the sphere, so it is enclosed, wherever inside it sits.',
      },
      solve: {
        tex: raw`\oint d\Omega=4\pi\;\Rightarrow\;\Phi=\frac{q}{4\pi\varepsilon_0}\,(4\pi)=\frac{q}{\varepsilon_0}`,
        answer: raw`\Phi=\frac{q}{\varepsilon_0}`,
        say: raw`Seen from $q$, the sphere surrounds it and fills every direction once: the whole solid angle, $4\pi$.`,
        line: raw`The sphere fills every direction once, $4\pi$ in all: the flux is $q/\varepsilon_0$.`,
        caption: 'Seen from q, the sphere surrounds it, filling every direction exactly once: the whole solid angle, four π. So the flux is q over ε₀, exactly as with q at the centre: positive for a positive q, negative for a negative one.',
      },
      checks: [
        {title: 'Uneven, the same total', text: raw`The patches nearest $q$ carry more flux than the far ones, since the field there is stronger. The total is still $q/\varepsilon_0$, as it was with $q$ at the centre.`},
        {title: 'Any shape', text: raw`Nothing in the argument used the sphere: any closed surface round $q$ fills every direction once, seen from $q$, and carries $q/\varepsilon_0$.`},
        {title: 'Either sign', text: raw`For a negative $q$ every patch carries flux in, more of it near $q$, and the total is the negative $q/\varepsilon_0$.`},
      ],
    },
    {
      key: 'outside', label: 'Charge outside',
      figure: {charge: {kind: 'offset', size: 2.15, symbol: 'q', name: 'a point charge'}, surface: {kind: 'sphere', size: {min: .8, max: 1.7, initial: 1.3}, other: 0, label: 'Radius r'}},
      setup: raw`Step three. A point charge $q$ sits outside a sphere of radius $r$. Find the flux $\Phi$ out through the sphere.`,
      symmetry: {
        tex: raw`\vec E=\frac{q}{4\pi\varepsilon_0s^2}\,\hat{\mathbf s}`,
        say: raw`The field is radial from $q$, which is outside: strong on the side facing it, weak on the far side.`,
        line: raw`The field is radial from $q$, outside the sphere: strong near it, weak beyond.`,
        caption: 'The field is a point charge’s, radial from q, which sits outside the sphere: strongest on the side of the sphere facing q and weakest on the far side.',
      },
      surface: {
        tex: raw`\Omega_{\text{near}}=\Omega_{\text{far}}=\Omega`,
        say: raw`Seen from $q$, the sphere fills a cone of solid angle $\Omega$. Every line in it crosses the sphere twice: in through the near side, out through the far side.`,
        line: raw`Seen from $q$, the sphere fills one cone, and each line in it crosses twice.`,
        caption: 'Seen from q, the sphere fills one cone of directions, of solid angle Ω. Every line in that cone crosses the sphere twice: once going in, through the side facing q, and once coming out, through the far side.',
      },
      left: {
        tex: raw`\Phi=-\frac{q\,\Omega}{4\pi\varepsilon_0}+\frac{q\,\Omega}{4\pi\varepsilon_0}`,
        say: raw`On the near side the line from $q$ runs against the outward normal, so those patches carry $-q\,d\Omega/4\pi\varepsilon_0$; the far side fills the same cone with the opposite sign.`,
        line: raw`The near side carries $-q\Omega/4\pi\varepsilon_0$, the far side $+q\Omega/4\pi\varepsilon_0$.`,
        caption: 'The left side. On the side facing q the field crosses in for a positive q and out for a negative one. On the far side it crosses the other way. Both sides fill the same cone seen from q, so they carry equal flux of opposite sign.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=0`,
        say: raw`The charge is outside: nothing is enclosed.`,
        line: raw`The charge is outside the sphere: nothing is enclosed.`,
        caption: 'The right side. The only charge is outside the sphere, so the charge enclosed is zero.',
      },
      solve: {
        tex: raw`\Phi=0=\frac{Q_{\text{enc}}}{\varepsilon_0}`,
        answer: raw`\Phi=0`,
        note: raw`Zero for either sign of $q$. The field on the sphere is not zero: it goes in on one side and out on the other, and none is left over.`,
        say: raw`In and out cancel exactly, for any sphere that leaves $q$ outside.`,
        line: raw`In and out cancel exactly: a charge outside adds nothing to the flux.`,
        caption: 'The two sides cancel exactly, so the flux is zero, as Gauss’s law says with nothing inside. The field is not zero anywhere on the sphere: it goes in on one side and out on the other.',
      },
      checks: [
        {title: 'Zero flux, not zero field', text: raw`Every patch has field crossing it. The arrows on the side facing $q$ and on the far side point opposite ways through the surface; only their total is zero.`},
        {title: 'Let it out', text: raw`In the instrument below, slide the charge out through the sphere: the stacked flux stays $q/\varepsilon_0$ until the moment it crosses the surface, then drops to zero, and returns to $q/\varepsilon_0$ only when the charge comes back in.`},
        {title: 'Either sign', text: raw`For a negative $q$ the near side carries flux out and the far side in. The total is still zero.`},
      ],
    },
  ],
  traps: [
    {wrong: 'The field in Gauss’s law is only the field of the charge inside.', right: raw`It is the total field, from every charge. Charges outside add nothing to the net flux, but they still add to the field, as a capacitor’s other plate does at a pillbox round one plate.`},
    {wrong: 'A charge outside makes no field on the surface.', right: raw`Its field crosses the surface, in where it faces the charge and out on the far side, or the other way for a negative charge. Only the net flux is zero.`},
    {wrong: 'Moving a charge about inside the surface changes the flux.', right: raw`Seen from the charge, the surface still fills every direction once: the flux stays $q/\varepsilon_0$ until the charge crosses the surface.`},
  ],
  instrument: 'inside',
  next: 'qenc',
  related: {field: 'sheet', text: 'Built the long way, ring by ring: a field the Sheets and slabs lesson gets in two lines'},
};
