import {v3} from '../physics';
import type {GaussLesson} from '../types';
const raw = String.raw;
/* WHEN SYMMETRY RUNS OUT. Gauss's law holds for every closed surface round every charge; what it needs, to be solved
 * for E, is a surface on which E is the same all over (or along it, or zero), and only a symmetric charge gives one.
 * Two cases where none exists: a finite rod in a closed cylinder (its field changes along the wall and leaks out of
 * the ends, yet the patches still add to 2λℓ/ε₀), and a point charge off the centre of a cube (the whole flux is q/ε₀,
 * each face's share needs its own integral, and only at the centre does symmetry give each a sixth). The run ends
 * on the flux, which the law gives, and never draws a solved field at P, which it does not; the field of the finite
 * rod is what the integral lesson "Field on the bisector of a rod" builds. The instrument moves the charge about the
 * cube and shows the six shares changing while their sum does not. Gauss's law never fails here: it stops being
 * solvable. Every sentence holds for either sign. */
/** The field drawn at the standard arrow length in both cases: a little less than the rod's at its middle, the
 * opening radius out, with the cube's charge equal to the rod's whole charge (2λℓ, λ = 1, ℓ = 1), so one scale serves
 * both. Arrows that would run longer are held to the figure, as the steep fields of point charges are elsewhere. */
const REFERENCE = 2;
export const lesson: GaussLesson = {
  id: 'runs-out',
  title: 'When symmetry runs out',
  short: 'When symmetry runs out',
  about: 'A finite rod and a charge off a cube’s centre: Gauss’s law still holds, but no surface makes it solvable for E.',
  lead: raw`Gauss’s law holds for every closed surface round every charge. What runs out is a surface on which $E$ is the same all over: without one, the law gives the flux, and the field stays inside its integral.`,
  sections: [
    {heading: 'The law holds; the solve needs symmetry', body: [
      raw`Every time an earlier lesson found $E$, it took the same last step: $E$ came out of the integral, because on each part of the surface it was the same all over and square to it, or lay along it, or was zero. That step is not part of Gauss’s law. It is a gift of the charge’s symmetry, and the law itself asks nothing of the surface but that it be closed:`,
      {tex: raw`\oint\vec E\cdot d\vec A=\frac{Q_{\text{enc}}}{\varepsilon_0}\quad\text{for every closed surface}`},
      raw`So a charge with too little symmetry does not break the law. It leaves one equation, true, with the unknown field still under an integral sign: a single number about the field, where the field is a whole function. Gauss’s law has not failed; it has stopped being solvable for $E$.`,
    ]},
    {heading: 'A finite rod', body: [
      raw`A rod of length $2\ell$ carrying $\lambda$ is still round about its axis, but it is not the same all along it. Close to it, near its middle, the field is nearly an infinite line’s; toward its ends it weakens and tilts, gaining a part along the axis, and on the axis beyond its ends it points straight along the axis. A cylinder round the whole rod still holds $2\lambda\ell$, and the flux through it is still $2\lambda\ell/\varepsilon_0$, whatever its radius; so is the flux through any closed surface round the whole rod. But on its wall $E_s$ changes from patch to patch, and its ends carry flux too:`,
      {tex: raw`\int_{\text{wall}}E_s\,dA+\int_{\text{ends}}E_\perp\,dA=\frac{2\lambda\ell}{\varepsilon_0}`},
      raw`Neither integral collapses to $E$ times an area, and no closed surface round the rod does better: on none is its field both square to the surface and the same size all over, not even on the spheroids round it that the field crosses squarely everywhere. To find the field you add up the rod’s pieces, as the lesson on the field beside a rod’s middle does, and get $E=2k\lambda\ell/(r\sqrt{r^2+\ell^2})$ straight out from the middle (that lesson’s $kQ/(r\sqrt{r^2+L^2/4})$, with $L=2\ell$ and $Q=2\lambda\ell$). Close in, where $r\ll\ell$, that is the infinite line’s $2k\lambda/r$; far off it is a point charge’s $k(2\lambda\ell)/r^2$. Gauss’s law gives each limit, treating the rod as an infinite line close in and as a point far off; only the integral joins them.`,
    ]},
    {heading: 'A charge in a cube', body: [
      raw`Put a charge $q$ inside a cube. Its flux out of the cube is $q/\varepsilon_0$, wherever in the cube it sits. How that flux divides among the six faces is another matter. With the charge at the centre, the six faces look the same from it, so each takes a sixth, $q/(6\varepsilon_0)$, by symmetry alone. Move the charge and the near face takes more, the far face less; each share is now an integral over its face of a field that changes across it, and Gauss’s law fixes only their sum.`,
      {tex: raw`\sum_{\text{six faces}}\Phi_{\text{face}}=\frac{q}{\varepsilon_0}`},
    ]},
    {heading: 'What the law still gives', body: [
      raw`Even without symmetry the law is worth using. It gives the total flux through any closed surface from the charge inside, or the charge inside from a flux. It gives equal shares wherever a turn or a mirror that leaves the charge in place carries one part of the surface onto another, as it carries each face of a cube onto the next with the charge at the centre. And it often gives the limits a hard integral must reach. What it cannot give is the field point by point from one equation; for that, build the integral.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§6.3, Applying Gauss’s Law: why the symmetric cases are the ones it solves', url: 'https://openstax.org/books/university-physics-volume-2/pages/6-3-applying-gausss-law'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.2.3, Applications of Gauss’s law: always true, not always useful'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics: Gauss’s law, and why the infinite line is special'},
  ],
  cases: [
    {
      key: 'rod', label: 'Finite rod',
      figure: {charge: {kind: 'segment', size: 1, symbol: raw`\lambda`, name: 'a finite rod of charge'},
        surface: {kind: 'cylinder', size: {min: .3, max: 1.6, initial: .7}, other: 1.4, label: 'Radius r', cut: {bands: 4, sectors: 8, rings: 2}}, reference: REFERENCE},
      setup: raw`A rod of length $2\ell$ carries $\lambda$ per unit length. Draw a closed cylinder round the whole of it. What does Gauss’s law say, and can it give the field at $P$ beside the rod’s middle?`,
      symmetry: {
        tex: raw`\vec E=E_s(s,z)\,\hat{\mathbf s}+E_z(s,z)\,\hat{\mathbf z}`,
        say: raw`Round about its axis and the same above and below its middle, but not the same along it: $\vec E$ depends on the height $z$ too, and tilts off the radial toward the ends.`,
        line: raw`Round its axis, but not the same along it: $\vec E$ changes with $z$ and leans.`,
        caption: 'A turn about its axis leaves the finite rod as it was, so the field’s size depends only on the distance out and the height. A mirror in any plane through the axis leaves it as it was too, so the field has no part swirling round it, and flipping it end for end mirrors the field above and below its middle. But sliding it along its axis does change it: toward the ends its field weakens and tilts off the radial. Level with the middle, at P, the field points straight out; only its size is unknown.',
      },
      surface: {
        tex: raw`\text{wall}+\text{two ends}`,
        say: raw`A cylinder of radius $r$ through $P$, longer than the rod, so it holds all of it.`,
        line: raw`A closed cylinder through $P$, round the whole rod.`,
        caption: 'Draw a closed cylinder of radius r through P, on the rod’s axis and longer than the rod, so it holds all of it: a wall and two ends.',
      },
      left: {
        tex: raw`\Phi=\int_{\text{wall}}E_s\,dA+\int_{\text{ends}}E_\perp\,dA`,
        say: raw`$E_s$ is weaker on the wall’s patches toward the ends, and the ends carry flux: neither integral collapses to $E$ times an area.`,
        line: raw`$E_s$ changes along the wall, and the ends carry flux: $E$ stays inside.`,
        caption: 'The left side. On the wall the field’s part along the normal is largest beside the middle and weaker toward the ends, where the field leans; the ends carry flux too, where for an infinite line they carried none. No part has the field the same all over it, so nothing comes out of the integral.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=\lambda\,(2\ell)`,
        say: raw`The cylinder holds the whole rod.`,
        line: raw`Inside is the whole rod: $2\lambda\ell$.`,
        caption: 'The right side is easy: the cylinder holds the whole rod, two λ ℓ, whatever its radius.',
      },
      solve: {
        tex: raw`\int_{\text{wall}}\!E_s\,dA+\int_{\text{ends}}\!E_\perp\,dA=\frac{2\lambda\ell}{\varepsilon_0}`,
        answer: raw`\oint\vec E\cdot d\vec A=\frac{2\lambda\ell}{\varepsilon_0}`,
        label: 'The answer, the flux out through the closed cylinder',
        say: raw`True for every radius, so long as the cylinder holds the whole rod, and one equation for a whole field: $E$ at $P$ is not in it alone. Build the integral to find it.`,
        line: raw`True, but one equation for a whole field: $E$ at $P$ cannot be solved for.`,
        caption: 'The law holds: the patches’ fluxes add to two λ ℓ over ε₀, for any radius, so long as the cylinder holds the whole rod. But it is one equation for a field that changes from patch to patch, so it cannot be solved for the field at P. That needs the integral, built piece by piece.',
        note: raw`This is the flux, all Gauss’s law gives here. The field at $P$ is the integral lesson’s: build it piece by piece.`,
      },
      checks: [
        {title: 'Drag the radius', text: raw`The patches change: the wider the cylinder, the more of the flux leaves through its ends and the less through its wall. Their sum stays $2\lambda\ell/\varepsilon_0$.`},
        {title: 'The integral agrees', text: raw`The field beside the middle, built piece by piece in the lesson on a rod’s middle, depends on $r$ and on the rod’s half-length $\ell$. Close in it is a line’s, far off a point charge’s:`, tex: raw`r\ll\ell:\ \frac{2k\lambda}{r},\qquad r\gg\ell:\ \frac{k(2\lambda\ell)}{r^2}`},
        {title: 'Not a failure', text: raw`Nothing here contradicts Gauss’s law. It is the same law that solved the infinite line; the rod’s ends took away the symmetry that let it be solved.`},
      ],
    },
    {
      key: 'cube', label: 'Charge in a cube',
      figure: {charge: {kind: 'point', size: 0, symbol: 'q', name: 'a point charge off the centre of a cube', at: v3(.35, 0, .2), amount: 2},
        surface: {kind: 'cube', size: {min: .62, max: 1.3, initial: .85}, other: 0, label: 'Half-width a'}, reference: REFERENCE},
      setup: raw`A point charge $q$ sits inside a cube of half-width $a$, off its centre. Find the flux out of the cube, and say what Gauss’s law can and cannot tell you about each face.`,
      symmetry: {
        tex: raw`\text{one mirror only: front and back alike}`,
        say: raw`Only the mirror through the charge’s own plane leaves things as they were: front and back see the same field, and the other four faces all differ.`,
        line: raw`Off centre, the six faces see the charge differently.`,
        caption: 'Seen from the charge, only one mirror leaves the cube as it was, so the front and back faces match. The other four lie at different distances and angles, and the field across every face changes from point to point.',
      },
      surface: {
        tex: raw`\text{six faces}`,
        say: raw`The cube itself is the closed surface: six faces, each $2a$ across.`,
        line: raw`The cube itself: six faces round the charge.`,
        caption: 'The cube is the closed surface: six flat faces round the charge.',
      },
      left: {
        tex: raw`\Phi=\sum_{\text{faces}}\int E_\perp\,dA`,
        say: raw`On every face $E_\perp$ changes from patch to patch: each face’s flux is an integral of its own.`,
        line: raw`Each face’s flux is its own integral: $E_\perp$ changes across every face.`,
        caption: 'The left side. On every face the field’s part along the normal changes from patch to patch, strongest where the face is nearest the charge. Each face’s flux is an integral of its own.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=q`,
        say: raw`The charge is inside, wherever in the cube it sits.`,
        line: raw`Inside is the charge, $q$, wherever it sits.`,
        caption: 'The right side: the cube holds the charge q, wherever inside it the charge sits.',
      },
      solve: {
        tex: raw`\begin{aligned}\Phi&=\frac{q}{\varepsilon_0}\\\Phi_{\text{face}}&=\frac{q}{6\varepsilon_0}\ \text{at the centre only}\end{aligned}`,
        answer: raw`\Phi=\frac{q}{\varepsilon_0}`,
        label: 'The answer, the flux out through the cube',
        say: raw`The six shares add to $q/\varepsilon_0$; only a charge at the centre gives each face a sixth, by symmetry.`,
        line: raw`The total is $q/\varepsilon_0$; each face’s share needs its own integral.`,
        caption: 'The flux out of the cube is q over ε₀, wherever the charge is inside it: positive for a positive charge, negative for a negative one. How it divides among the faces needs each face’s integral. Only with the charge at the centre are the faces alike, each taking a sixth.',
        note: raw`It has the sign of $q$. Each face’s share is an integral of its own, except with $q$ at the centre, where each takes a sixth.`,
      },
      checks: [
        {title: 'Grow the cube', text: raw`Drag the half-width up: the charge sits nearer the middle in proportion, the faces’ shares even out, and the total never moves.`},
        {title: 'At the centre', text: raw`In the instrument below, put the charge at the centre: the six bars are equal, each a sixth of the whole, $q/(6\varepsilon_0)$.`},
        {title: 'A charge outside', text: raw`A charge outside a closed surface adds nothing to the total: its field crosses the surface, in through some faces and out through others.`},
      ],
    },
  ],
  traps: [
    {wrong: 'Gauss’s law fails for a finite rod.', right: raw`It holds for every closed surface: the flux round the rod is $2\lambda\ell/\varepsilon_0$. It cannot be solved for $E$, because no surface has the field the same all over it.`},
    {wrong: raw`A cylinder round a finite rod gives $E=\lambda/(2\pi\varepsilon_0r)$.`, right: raw`That needs the field the same along the wall and none through the ends, which holds for an infinite line. Round a finite rod neither holds; only a short cylinder close round the middle, its radius and length both much less than $\ell$, comes near it.`},
    {wrong: raw`Each face of a cube round a charge carries $q/(6\varepsilon_0)$.`, right: raw`Only for a charge at the centre. Off centre the shares differ; only their sum, $q/\varepsilon_0$, is fixed.`},
    {wrong: 'If the field is not the same over the surface, the law is no use.', right: raw`It still gives the total flux from the charge inside, and the charge inside from a flux, and often the limits a hard integral must reach.`},
  ],
  instrument: 'cube',
  next: 'hard',
  related: {field: 'bisector', text: 'The field beside a rod’s middle, built piece by piece: what Gauss’s law cannot give here'},
  alongside: {field: 'bisector', text: 'The finite rod’s field at its middle, built as an integral'},
};
