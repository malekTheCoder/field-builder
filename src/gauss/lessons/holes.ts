import {v3} from '../physics';
import type {GaussLesson} from '../types';
const raw = String.raw;
/* HOLES BY SUPERPOSITION. A charge with a hole in it has lost the symmetry Gauss's law needs, but it is the sum of
 * two charges that each have it: the whole charge, as if the hole were filled, and a plug of the opposite charge
 * filling the hole (where both sit, ρ − ρ = 0, which is what the hole holds). Solve each alone, round its own surface
 * through P, and add the two fields as vectors. The ball and the rod come in the order the owner's study guide takes
 * them: a ball with an off-centre hole (the field in the hole is uniform, ρd⃗/(3ε₀)), then a rod with a hole drilled
 * along it (ρd⃗/(2ε₀)), in the text and in the instrument, which shows the rod end on; then a sheet with a round hole,
 * which the guide does not have, whose plug is a disc: no Gaussian surface solves a disc, so its field on its axis comes
 * from the Disk lesson's integral. The figure runs the ball and the sheet. It draws each piece's surface carrying that
 * piece's own field, and at P the two fields tip to tail, adding to the answer. (A rod cut through both axes would put
 * P, the axes and every vector on one line, and show no addition at all: the instrument's end-on cut does.) The
 * instrument moves the hole: the field in it follows d⃗. Every sentence holds for either sign. */
/** One density for the lesson, ρ = 1 and σ = 1 in the figure's units (k = 1): a ball of radius R then carries
 * 4πR³/3. One scale for both cases, so equal fields are drawn equal. It is set so that no patch's arrow reaches past
 * a place where its own piece's field turns round (the plug's arrows stop short of the hole's centre, the sheet's
 * short of the sheet, for either sign), and no arrow at P is held to the figure's longest: the two pieces' arrows at
 * P add, tip to tail, exactly to the answer's. The hole lies wholly inside the ball with charge all round it, P stays
 * in it along the whole slider, and no Gaussian surface ever lies on a charge's surface. */
const REFERENCE = 4.5;
const BALL = {R: 1.4, b: .55, at: v3(.6, 0, .33)};
export const lesson: GaussLesson = {
  id: 'holes',
  title: 'Holes by superposition',
  short: 'Holes',
  about: 'A hole as the whole charge plus a plug of the opposite sign, each solved by Gauss’s law.',
  lead: raw`A charge with a hole in it has lost the symmetry Gauss’s law needs, but it is two charges that each have it: the whole charge, as if the hole were filled, and a plug of the opposite charge filling the hole. Solve each by Gauss’s law and add the fields.`,
  sections: [
    {heading: 'A hole is two charges', body: [
      raw`Gauss’s law needs a surface on which the field is the same all over, and a ball with an off-centre hole has none: it is round about no point at all. But fill the hole with charge of density $\rho$, and fill it again with charge of density $-\rho$, and nothing has changed, since the two cancel. Now group the charge differently. The first filling, with the rest of the ball, makes a whole ball of $\rho$. The second is a small ball of $-\rho$, the plug. Each of those is round about its own centre, so each one can be solved alone.`,
      {tex: raw`\text{charge with a hole}=\text{whole charge}\,(\rho)\;+\;\text{plug}\,(-\rho)`},
      raw`Fields add, so the real field at any point is the whole charge’s field there plus the plug’s. They add as vectors: each points along its own radius, from its own centre, and the two radii are not the same line.`,
    ]},
    {heading: 'The field in a ball’s hole', body: [
      raw`Put $P$ in the hole. A sphere about the ball’s centre through $P$, of radius $r_1$, holds $\rho\,\frac43\pi r_1^3$ of the whole ball, so the whole ball’s field there is $\rho r_1/(3\varepsilon_0)$ along $\hat{\mathbf r}_1$: as a vector, $\rho\vec r_1/(3\varepsilon_0)$, with $\vec r_1$ running from the ball’s centre to $P$. The plug gives the same with $-\rho$ and $\vec r_2$, which runs from the hole’s centre to $P$. Adding:`,
      {tex: raw`\vec E=\frac{\rho\,\vec r_1}{3\varepsilon_0}-\frac{\rho\,\vec r_2}{3\varepsilon_0}=\frac{\rho}{3\varepsilon_0}(\vec r_1-\vec r_2)=\frac{\rho\,\vec d}{3\varepsilon_0}`},
      raw`Here $\vec d$ runs from the ball’s centre to the hole’s, and $\vec r_1-\vec r_2=\vec d$ wherever $P$ is. So the field is the same at every point of the hole: uniform, along $\vec d$ for a positive $\rho$ and against it for a negative one, and in general not along the radius from either centre. Its size does not depend on how big the hole is, only on how far it is off centre, so long as the hole lies wholly inside the ball. A hole at the centre, $\vec d=0$, has no field in it, as Gauss’s law says directly for a round hollow there.`,
      raw`The reason is the shape of the field inside a uniform ball: $\vec r$ times a constant. Two such fields, from two centres, differ by the constant times the step between the centres, whatever the point.`,
    ]},
    {heading: 'A rod with a hole drilled along it', body: [
      raw`The same move works for an infinite rod with a hole drilled parallel to its axis. Take two cylinders of length $L$ through $P$, one about the rod’s axis and one about the hole’s. Each piece’s field crosses only its own cylinder’s wall, so $E_1(2\pi r_1L)=\rho\pi r_1^2L/\varepsilon_0$ and the same for the plug with $-\rho$, where $\vec r_1$ and $\vec r_2$ now run square to the axes:`,
      {tex: raw`\vec E=\frac{\rho\,\vec r_1}{2\varepsilon_0}-\frac{\rho\,\vec r_2}{2\varepsilon_0}=\frac{\rho\,\vec d}{2\varepsilon_0}`},
      raw`Uniform again, with $\vec d$ the step from the rod’s axis to the hole’s, square to both. A ball gives a three under $\varepsilon_0$ and a rod a two, as their fields inside do. Choose the rod in the instrument below: it is cut square to its axis, and its hole’s field is half as big again as the ball’s for the same $\rho$ and the same step.`,
    ]},
    {heading: 'A sheet with a hole: one piece the law cannot do', body: [
      raw`An infinite sheet with a round hole of radius $b$ is a whole sheet of $\sigma$ plus a disc of $-\sigma$. The whole sheet is Gauss’s, $\sigma/(2\varepsilon_0)$ by a pillbox. The disc is not: it is round only about its axis, flat and edged, so no closed surface has its field the same all over it, and its field on its axis has to be added up ring by ring, as the Disk lesson does: $\frac{\sigma}{2\varepsilon_0}\big(1-z/\sqrt{z^2+b^2}\big)$ for a disc of $\sigma$, away from the disc for a positive $\sigma$ and toward it for a negative one. Superposition does not care where a piece’s field came from. On the hole’s axis, a height $z$ above it:`,
      {tex: raw`E_z=\frac{\sigma}{2\varepsilon_0}-\frac{\sigma}{2\varepsilon_0}\Big(1-\frac{z}{\sqrt{z^2+b^2}}\Big)=\frac{\sigma}{2\varepsilon_0}\,\frac{z}{\sqrt{z^2+b^2}}`},
    ]},
    {heading: 'Away from the hole', body: [
      raw`The pieces add everywhere, not only in the hole; only the result stops being simple. In the charge round a ball’s hole the plug looks like a point charge at the hole’s centre, so the field there is $\rho\vec r_1/(3\varepsilon_0)$ less the plug’s, which falls off as $1/r_2^2$ (round a rod’s hole, $\rho\vec r_1/(2\varepsilon_0)$ less a line charge’s, falling off as $1/r_2$). Outside the ball the two pieces look like point charges, the whole ball’s $\frac43\pi R^3\rho$ at its centre and the plug’s $-\frac43\pi b^3\rho$ at the hole’s. Move the hole in the instrument below and watch the field round it bend, while the field inside stays even.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§6.3, Applying Gauss’s Law: spherical, cylindrical and planar symmetry', url: 'https://openstax.org/books/university-physics-volume-2/pages/6-3-applying-gausss-law'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.2.3, Applications of Gauss’s law, and the problems on overlapping balls of +ρ and −ρ'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics: superposition, and the field of a uniform ball'},
  ],
  cases: [
    {
      key: 'ball', label: 'Ball with a hole',
      figure: {charge: {kind: 'ballhole', size: BALL.R, symbol: raw`\rho`, name: 'a uniformly charged ball with an off-centre hole', hole: {radius: BALL.b, at: BALL.at}, amount: 4 / 3 * Math.PI * BALL.R ** 3},
        surface: {kind: 'sphere', size: {min: .25, max: .95, initial: .55}, other: 0, label: 'Radius r₁'}, reference: REFERENCE},
      setup: raw`A ball of radius $R$ holds a uniform charge density $\rho$, except in a round hole of radius $b$, whose centre is a step $\vec d$ from the ball’s centre. Find the field at a point $P$ in the hole.`,
      symmetry: {
        tex: raw`\text{ball with hole}=\text{ball}\,(\rho)+\text{plug}\,(-\rho)`,
        say: raw`Round about no point, so no one sphere works. But a whole ball of $\rho$ and a plug of $-\rho$ in the hole add up to it, and each is round about its own centre.`,
        line: raw`Round about no point; but a whole ball of $\rho$ plus a plug of $-\rho$.`,
        caption: 'The ball with a hole is round about no point, so no single sphere has the field the same all over it. But it is the sum of two charges that are round: a whole ball of density ρ, as if the hole were filled, and a smaller ball of −ρ filling the hole. Where both sit they cancel, which is what the hole holds.',
      },
      surface: {
        tex: raw`A_1=4\pi r_1^2,\qquad A_2=4\pi r_2^2`,
        say: raw`Two spheres through $P$: radius $r_1$ about the ball’s centre, radius $r_2$ about the hole’s.`,
        line: raw`Two spheres through $P$: one about each centre, radii $r_1$ and $r_2$.`,
        caption: 'Draw two spheres through P: one about the ball’s centre, of radius r one, for the whole ball; one about the hole’s centre, of radius r two, for the plug.',
      },
      left: {
        tex: raw`\Phi_1=E_1\,(4\pi r_1^2),\qquad\Phi_2=E_2\,(4\pi r_2^2)`,
        say: raw`On its own sphere, each piece’s field is radial and the same all over: $E_1$ and $E_2$ are the signed parts along each sphere’s outward normal.`,
        line: raw`Each piece’s own field is the same all over its own sphere.`,
        caption: 'The left sides. On the sphere about the ball’s centre, the whole ball’s field is square to every patch and the same all over: E one times four π r one squared. On the sphere about the hole’s centre, the plug’s field is: E two times four π r two squared.',
      },
      right: {
        tex: raw`Q_1=\rho\,\tfrac43\pi r_1^3,\qquad Q_2=-\rho\,\tfrac43\pi r_2^3`,
        say: raw`Each sphere lies inside its own piece, so it holds the density times its volume.`,
        line: raw`Each sphere holds its own piece’s density times its volume.`,
        caption: 'The right sides. Each sphere lies inside its own piece, so the whole ball’s sphere holds ρ times its volume, and the plug’s holds −ρ times its own.',
      },
      solve: {
        tex: raw`\vec E=\frac{\rho\,\vec r_1}{3\varepsilon_0}-\frac{\rho\,\vec r_2}{3\varepsilon_0}=\frac{\rho\,\vec d}{3\varepsilon_0}`,
        answer: raw`\vec E=\frac{\rho\,\vec d}{3\varepsilon_0}\ \text{everywhere in the hole}`,
        say: raw`$\vec r_1$ runs from the ball’s centre to $P$ and $\vec r_2$ from the hole’s; their difference is $\vec d$, the same for every $P$ in the hole.`,
        line: raw`Add them: $\vec r_1-\vec r_2=\vec d$, the same all through the hole.`,
        caption: 'Each piece gives its field along its own radius. Added as vectors, the two radii differ by d, the step from the ball’s centre to the hole’s, whatever P is: the field is the same everywhere in the hole, along d for a positive ρ and against it for a negative one.',
        note: raw`It is a vector, the same at every point of the hole: along $\vec d$ for a positive $\rho$, against it for a negative one.`,
      },
      checks: [
        {title: 'Drag the slider', text: raw`$P$ moves across the hole, $r_1$ and $r_2$ change, and so do the two pieces’ fields; their sum, bold at $P$, does not.`},
        {title: 'A centred hole', text: raw`With $\vec d=0$ the field in the hole is zero, which a single sphere about the common centre says directly: it encloses nothing.`},
        {title: 'Outside the ball', text: raw`Outside, the two pieces look like point charges at their own centres, so far away the field is that of the ball’s net charge, $\rho\,\frac43\pi(R^3-b^3)$.`},
      ],
    },
    {
      key: 'sheet', label: 'Sheet with a hole',
      figure: {charge: {kind: 'sheethole', size: 0, symbol: raw`\sigma`, name: 'an infinite sheet of charge with a round hole', hole: {radius: 1, at: v3(0, 0, 0)}},
        surface: {kind: 'pillbox', size: {min: .9, max: 1.6, initial: 1}, other: .55, label: 'Height z'}, reference: REFERENCE},
      setup: raw`An infinite sheet carries $\sigma$ per unit area, except in a round hole of radius $b$. Find the field a height $z$ above the hole’s centre, on its axis.`,
      symmetry: {
        tex: raw`\text{sheet with hole}=\text{sheet}\,(\sigma)+\text{disc}\,(-\sigma)`,
        say: raw`The disc filling the hole is round only about its axis: no closed surface has its field the same all over, so Gauss’s law cannot give it.`,
        line: raw`A whole sheet of $\sigma$ plus a disc of $-\sigma$ filling the hole.`,
        caption: 'The sheet with a hole is a whole sheet of σ plus a disc of −σ filling the hole. The whole sheet is symmetric enough for Gauss’s law. The disc is not: it is round only about its axis, flat and edged, and no closed surface has its field the same all over it.',
      },
      surface: {
        tex: raw`A_{\text{faces}}=2A`,
        say: raw`A pillbox across the whole sheet, its top face through $P$. The disc gets none: its field on its axis comes from adding its rings.`,
        line: raw`A pillbox for the whole sheet; the disc has no surface that would work.`,
        caption: 'Stand a pillbox across the whole sheet, as if the hole were filled, its top face through P. The disc gets no Gaussian surface: its field on its axis is the Disk lesson’s, added up ring by ring.',
      },
      left: {
        tex: raw`\Phi_1=2E_1A`,
        say: raw`The whole sheet’s field crosses both faces, square to them; the side carries nothing.`,
        line: raw`The whole sheet’s field crosses both faces: $2E_1A$.`,
        caption: 'The left side, for the whole sheet. Its field crosses both faces the same way and lies along the side: two E one A.',
      },
      right: {
        tex: raw`Q_1=\sigma A`,
        say: raw`With the hole filled, the pillbox holds a disc of sheet of area $A$.`,
        line: raw`Filled in, the pillbox holds a disc of the sheet: $\sigma A$.`,
        caption: 'The right side. With the hole filled in, the pillbox holds a disc of the whole sheet, of area A: σ A.',
      },
      solve: {
        tex: raw`E_z=\frac{\sigma}{2\varepsilon_0}-\frac{\sigma}{2\varepsilon_0}\Big(1-\frac{z}{\sqrt{z^2+b^2}}\Big)=\frac{\sigma}{2\varepsilon_0}\frac{z}{\sqrt{z^2+b^2}}`,
        answer: raw`E_z=\frac{\sigma}{2\varepsilon_0}\,\frac{z}{\sqrt{z^2+b^2}}`,
        say: raw`The whole sheet gives $\sigma/(2\varepsilon_0)$; the disc of $-\sigma$ takes back the Disk lesson’s field on its axis.`,
        line: raw`The sheet’s $\sigma/(2\varepsilon_0)$, less the disc’s field on its axis.`,
        caption: 'Add the two: the whole sheet’s σ over two ε₀, and the disc’s field on its axis with −σ, which the Disk lesson built ring by ring. What is left grows from nothing in the hole’s plane toward the whole sheet’s field far above. Away from the sheet for a positive σ, toward it for a negative one.',
      },
      checks: [
        {title: 'At the hole’s centre', text: raw`At the hole’s centre, $z=0$, the field is zero: the sheet’s charge lies evenly all round it, and its pushes or pulls cancel. Elsewhere in the hole’s plane the field runs along the plane, not across it.`},
        {title: 'Far above', text: raw`For $z\gg b$, $z/\sqrt{z^2+b^2}\to1$ and the field is the whole sheet’s $\sigma/(2\varepsilon_0)$: from far away the hole is too small to matter.`},
        {title: 'Zero flux, not zero field', text: raw`A pillbox narrower than the hole, standing on its axis, holds none of the real sheet’s charge, so its flux is zero; yet the field is not: for a positive $\sigma$ it leaves through both faces and comes in through the side, for a negative one the reverse.`},
      ],
    },
  ],
  traps: [
    {wrong: 'A ball with a hole has no symmetry, so Gauss’s law is no help.', right: raw`No single surface works, but each piece, the whole ball and the plug of $-\rho$, has its own symmetry. Solve each, then add.`},
    {wrong: 'There is no charge in the hole, so there is no field in it.', right: raw`The charge round an off-centre hole is not round about it. The field there is $\rho\vec d/(3\varepsilon_0)$; only a centred hole has none.`},
    {wrong: 'Subtract the plug’s field from the ball’s as numbers.', right: raw`Add them as vectors: each points along its own radius, from its own centre. Their sum is along $\vec d$, which in general neither radius is.`},
    {wrong: 'The field in the hole points away from the ball’s centre.', right: raw`It is the same at every point of the hole, along $\vec d$ (against it for a negative $\rho$), and depends on where the hole is, not its size, so long as it lies inside the ball.`},
  ],
  instrument: 'hole',
  next: 'runs-out',
  related: {field: 'disk', text: raw`The disc’s field on its axis, built ring by ring: the piece a sheet’s hole takes away`},
  alongside: {field: 'disk', text: raw`The disc of $-\sigma$ a sheet’s hole takes away, its field on the axis built ring by ring`},
};
