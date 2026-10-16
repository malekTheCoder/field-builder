import type {GaussLesson} from '../types';
const raw = String.raw;
/* CONDUCTORS. One physical fact and Gauss's law: in a conductor at rest the field inside the metal is zero, since
 * otherwise its free charges would still be moving. A Gaussian surface drawn inside the metal then has no flux, so
 * it encloses no charge, and everything else follows: excess charge on the surface, the field just outside σ/ε₀
 * and square to it (a one-sided pillbox, twice a lone sheet's), an empty hollow with no field, and a charge q in a
 * hollow pulling −q onto the hollow's wall and pushing +q (with any net charge) onto the outside. Three cases, in
 * the study guide's order: a charged metal ball, its surface close up, and a charge in a hollow. The instrument
 * moves the charge about the hollow: the wall's charge follows it, and the outside's stays even. Every sentence
 * holds for either sign. */
/** The fields drawn at the standard arrow length: a unit charge's a little way out from the ball, for the ball and
 * the hollow, so a field that falls as 1/r² is seen to fall; σ/ε₀ for unit σ at the conductor's face. Every surface
 * of metal sits off the slider's grid of hundredths, so the Gaussian sphere never lies exactly on one. */
const REFERENCE = 1 / 1.6 ** 2, FACE = 4 * Math.PI;
const POINT = raw`\frac{q}{4\pi\varepsilon_0r^2}`;
export const lesson: GaussLesson = {
  id: 'conductors',
  title: 'Conductors',
  short: 'Conductors',
  about: 'No field inside the metal, charge on its surface, and cavities that hold charge.',
  lead: raw`In a conductor at rest there is no field inside the metal. Draw a Gaussian surface inside the metal and it has no flux, so it encloses no charge: almost every result in this lesson follows from that one move.`,
  sections: [
    {heading: 'Why the metal has no field', body: [
      raw`A conductor is full of charges free to move. Put it in a field and they move, and they keep moving until the field they make cancels the one that moved them. When nothing moves any more, the conductor is in electrostatic equilibrium, and the field everywhere inside its metal is zero. That is a physical fact about metal, not something Gauss’s law proves; Gauss’s law is what turns it into answers.`,
    ]},
    {heading: 'A surface inside the metal', body: [
      raw`Draw any closed surface lying wholly in the metal. The field is zero at every patch of it, so its flux is zero, and by Gauss’s law it encloses no net charge:`,
      {tex: raw`\vec E=0\ \text{in the metal}\;\Rightarrow\;\oint\vec E\cdot d\vec A=0\;\Rightarrow\;Q_{\text{enc}}=0`},
      raw`Shrink and move the surface anywhere in the metal and the same holds, so there is no charge anywhere inside it. Any excess charge a conductor carries sits on its surface. An isolated charged metal ball has all of its $Q$ on its skin, spread evenly, and outside it makes the field of a point charge at its centre, the same as a thin shell carrying $Q$.`,
    ]},
    {heading: 'Just outside: sigma over epsilon nought', body: [
      raw`Just outside, the field is square to the surface. Its part along the surface is the same on both sides of a surface charge, and in the metal it is zero; were it not, it would push the surface charge along, and the charge is at rest. Stand a small pillbox across the surface, one face in the metal and one just outside. The face in the metal sees no field, the side sees a field along it, and only the outer face carries flux:`,
      {tex: raw`E_\perp A=\frac{\sigma A}{\varepsilon_0}\;\Rightarrow\;E_\perp=\frac{\sigma}{\varepsilon_0}`},
      raw`That is twice a lone sheet’s $\sigma/(2\varepsilon_0)$, and both are right. A lone sheet sends its flux out of both faces of the pillbox; the conductor sends all of it out of one, because all the other charge, the rest of the conductor’s and any near it, cancels the patch’s own field in the metal and doubles it outside. Where $\sigma$ is negative, $E_\perp$ is too, and the field points into the metal.`,
    ]},
    {heading: 'A hollow in the metal', body: [
      raw`Cut a hollow into the metal. If it holds no charge, a surface in the metal round it encloses nothing, so its wall carries no net charge. That it carries none anywhere, and the hollow has no field, takes one more fact: a field line in the hollow would run from plus to minus on the wall, and carried on round through the field-free metal it would close a loop on which a charge gains energy, which a static field cannot do. Metal closed round a space shields it from every static field outside: a sealed metal box keeps what is inside it free of them.`,
      raw`Now put a charge $q$ in the hollow. A surface in the metal round the hollow still has no flux, so it must still enclose nothing: the wall gathers $-q$. That charge came from the metal, so if the metal was neutral, $+q$ is left over, and it goes to the outer surface. With a net charge $Q$ of its own on the metal:`,
      {tex: raw`q_{\text{wall}}=-q,\qquad q_{\text{outer}}=Q+q`},
      raw`Move $q$ about inside the hollow and the wall’s $-q$ crowds toward it, but the outside charge on an isolated round conductor stays spread evenly: the field-free metal screens the outside from where $q$ is. It does not screen it from how much: the outside always carries the $q$, plus any net charge of the metal’s own.`,
    ]},
    {heading: 'Solving one, region by region', body: [
      raw`For a charge $q$ at the centre of a hollow of radius $a$ in a neutral metal ball of radius $b$, a sphere through $P$ gives $E_r(4\pi r^2)=Q_{\text{enc}}/\varepsilon_0$ in each region. In the hollow it encloses $q$; in the metal, $q-q=0$, as it must; outside, $q-q+q=q$. The field is a point charge’s in the hollow, nothing in the metal, and a point charge’s again outside.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§6.4, Conductors in Electrostatic Equilibrium', url: 'https://openstax.org/books/university-physics-volume-2/pages/6-4-conductors-in-electrostatic-equilibrium'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.5, Conductors: basic properties, induced charges, surface charge and the force on it'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 3, Electric fields around conductors'},
  ],
  cases: [
    {
      key: 'ball', label: 'Metal ball',
      figure: {charge: {kind: 'metal', size: 1.005, symbol: 'Q', name: 'a charged metal ball', bounds: ['R']}, surface: {kind: 'sphere', size: {min: .45, max: 2.2, initial: .7}, other: 0, label: 'Radius r',
        regions: [
          {name: 'inside the metal', tex: raw`E_r=0`, say: raw`In the metal there is no field: a sphere there encloses no charge.`},
          {name: 'outside the ball', tex: raw`E_r=\frac{Q}{4\pi\varepsilon_0r^2}`, say: raw`Outside, the sphere holds all of $Q$, which sits on the ball’s surface: a point charge’s field.`},
        ]}, reference: REFERENCE},
      setup: raw`A solid metal ball of radius $R$ carries a net charge $Q$, and nothing in it moves any more. Where is the charge, and what is the field inside the metal and outside it?`,
      symmetry: {
        tex: raw`\vec E=E_r(r)\,\hat{\mathbf r},\qquad \vec E=0\ \text{in the metal}`,
        say: raw`The ball is round, so the field is radial. In metal at rest the field is zero: a physical fact, not a symmetry.`,
        line: raw`The ball is round, so $\vec E$ is radial; in metal at rest, $\vec E=0$.`,
        caption: 'Any turn about the centre leaves the ball as it was, so the field points along the radius with a size that depends only on r. Inside the metal, at rest, the field is zero: if it were not, the metal’s free charges would still be moving.',
      },
      surface: {
        tex: raw`A=4\pi r^2`,
        say: raw`A sphere through $P$, centred on the ball: inside the metal, or outside it.`,
        line: raw`A sphere through $P$, centred on the ball: inside the metal, or out.`,
        caption: 'Draw a sphere of radius r through P, centred on the ball. Drag it inside the metal, where every patch sees no field, or outside, where the field is square to every patch and the same all over.',
      },
      left: {
        tex: raw`\Phi=E_r\,(4\pi r^2)=0\ \ (r<R)`,
        say: raw`In the metal every patch carries nothing, so the flux is zero.`,
        line: raw`The flux is $E_r(4\pi r^2)$; in the metal, where $E_r=0$, it is zero.`,
        caption: 'The left side is E_r times four π r squared. Inside the metal every patch sees no field and carries nothing, so the flux through the sphere is zero.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=\begin{cases}0, & r<R\\Q, & r>R\end{cases}`,
        say: raw`Zero flux means zero charge inside, however close to $R$ the sphere goes: all of $Q$ is on the surface.`,
        line: raw`Zero flux, so no charge inside the metal: all of $Q$ is on the surface.`,
        caption: 'The right side. A sphere in the metal has zero flux, so it encloses no charge, however close to the surface it goes: all of Q sits on the ball’s surface. A sphere outside encloses all of Q.',
      },
      solve: {
        tex: raw`E_r=\begin{cases}0, & r<R\\[4pt]\dfrac{Q}{4\pi\varepsilon_0r^2}, & r>R\end{cases}`,
        answer: raw`E_r=\begin{cases}0, & r<R\\[4pt]\dfrac{Q}{4\pi\varepsilon_0r^2}, & r>R\end{cases}`,
        say: raw`Inside, nothing; outside, a point charge’s field, as for a thin shell carrying $Q$.`,
        line: raw`No field in the metal; outside, a point charge’s field.`,
        caption: 'There is no field in the metal, and all of the charge is on the surface. Outside, the field is a point charge’s, as if all of Q sat at the centre: out for a positive Q, in for a negative one.',
      },
      checks: [
        {title: 'Sigma over epsilon nought at the surface', text: raw`The charge spreads evenly over the round surface, $\sigma=Q/(4\pi R^2)$, and just outside, $E_r=Q/(4\pi\varepsilon_0R^2)$, which is $\sigma/\varepsilon_0$: the conductor’s rule.`},
        {title: 'Like a shell', text: raw`A solid metal ball and a thin shell carrying the same $Q$ make the same field everywhere: the metal’s inside holds no charge and no field, so it might as well be hollow.`},
        {title: 'Radius, not diameter', text: raw`Problems often give a ball’s diameter. The $R$ here, and in $\sigma=Q/(4\pi R^2)$, is the radius.`},
      ],
    },
    {
      key: 'face', label: 'Just outside its surface',
      figure: {charge: {kind: 'face', size: 0, symbol: raw`\sigma`, name: 'the flat face of a large charged metal plate'}, surface: {kind: 'pillbox', size: {min: .25, max: 1.2, initial: .55}, other: .85, label: 'Height z'}, reference: FACE},
      setup: raw`Close to a charged conductor at rest, its surface looks flat and the charge on it looks even. Here, the face of a large flat metal plate, carrying $\sigma$ per unit area on this face. Find the field just outside.`,
      symmetry: {
        tex: raw`\begin{aligned}\vec E&=0\ \ \text{in the metal}\\\vec E&=E_\perp\,\hat{\mathbf n}\ \ \text{outside}\end{aligned}`,
        say: raw`$\hat{\mathbf n}$ points out of the metal. The part of $\vec E$ along the surface is the same on both sides of it, so zero, as in the metal.`,
        line: raw`No field in the metal; outside, $\vec E$ is square to the surface.`,
        caption: 'In the metal there is no field. Just outside, the field is square to the surface: its part along the surface is the same on both sides of the surface charge, and on the metal’s side it is zero. Were it not, it would push the surface charge along, and the charge is at rest.',
      },
      surface: {
        tex: raw`A_{\text{face}}=A`,
        say: raw`A pillbox across the surface: one face in the metal, one face of area $A$ outside it.`,
        line: raw`A pillbox across the surface: one face in the metal, one outside.`,
        caption: 'Stand a pillbox across the surface, one face of area A outside the metal and the other inside it.',
      },
      left: {
        tex: raw`\Phi=E_\perp A+0+0=E_\perp A`,
        say: raw`The face in the metal sees no field. The side sees a field along it outside, and none inside.`,
        line: raw`Only the outer face carries flux, $E_\perp A$: the metal’s side has none.`,
        caption: 'The left side. The face inside the metal sees no field and carries nothing. The side carries nothing either: outside, the field lies along it; inside, there is none. Only the outer face carries flux, E_⊥ A.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=\sigma A`,
        say: raw`The pillbox cuts a patch of area $A$ out of the surface charge.`,
        line: raw`Inside is a patch of the surface charge of area $A$: $\sigma A$.`,
        caption: 'The right side. The pillbox encloses a patch of the surface, of area A, holding σ A.',
      },
      solve: {
        tex: raw`E_\perp A=\frac{\sigma A}{\varepsilon_0}\;\Rightarrow\;E_\perp=\frac{\sigma}{\varepsilon_0}`,
        answer: raw`E_\perp=\frac{\sigma}{\varepsilon_0}`,
        say: raw`Twice a lone sheet’s field: all the flux leaves through one face.`,
        line: raw`$E_\perp=\sigma/\varepsilon_0$: twice a lone sheet’s, all of it through one face.`,
        caption: 'Divide by A. Just outside a conductor the field is σ over ε₀, square to the surface: out of the metal where σ is positive, into it where σ is negative. Twice a lone sheet’s field, since here all of the flux leaves through one face.',
      },
      checks: [
        {title: 'Twice a lone sheet', text: raw`A lone sheet gives $\sigma/(2\varepsilon_0)$ because its pillbox has flux through both faces. Here the metal’s side has none, so one face carries it all. The difference is made by all the other charge, the rest of the conductor’s and any near it, which cancels the patch’s own field in the metal and doubles it outside.`},
        {title: 'The jump', text: raw`From no field in the metal to $\sigma/\varepsilon_0$ just outside: the jump of $\sigma/\varepsilon_0$ across a surface charge, all of it on one side.`},
        {title: 'The ball agrees', text: raw`For the metal ball, $Q/(4\pi\varepsilon_0R^2)$ just outside is $\sigma/\varepsilon_0$ with $\sigma=Q/(4\pi R^2)$.`},
      ],
    },
    {
      key: 'cavity', label: 'A charge in a hollow',
      figure: {charge: {kind: 'cavity', size: .655, outer: 1.355, symbol: 'q', name: 'a neutral metal ball with a charge in a hollow at its centre', bounds: ['a', 'b']}, surface: {kind: 'sphere', size: {min: .35, max: 2.4, initial: 1}, other: 0, label: 'Radius r',
        regions: [
          {name: 'in the hollow', tex: raw`E_r=${POINT}`, say: raw`In the hollow the sphere holds only $q$: its field.`},
          {name: 'in the metal', tex: raw`E_r=0`, say: raw`In the metal there is no field, so the sphere encloses nothing: $q$ and the wall’s $-q$.`},
          {name: 'outside the metal', tex: raw`E_r=${POINT}`, say: raw`Outside, the sphere holds $q-q+q=q$: the outer surface’s charge makes $q$’s field again.`},
        ]}, reference: REFERENCE},
      setup: raw`A neutral metal ball of radius $b$ has a round hollow of radius $a$ at its centre, with a point charge $q$ at the hollow’s centre. Find the charge on the hollow’s wall and on the outside, and the field everywhere.`,
      symmetry: {
        tex: raw`\vec E=E_r(r)\,\hat{\mathbf r},\qquad\vec E=0\ \text{in the metal}`,
        say: raw`Everything is round about the centre, so the field is radial; in the metal it is zero.`,
        line: raw`All of it is round about the centre: $\vec E$ is radial, and zero in the metal.`,
        caption: 'The charge, the hollow and the ball are all round about the same centre, so the field points along the radius with a size that depends only on r. In the metal, at rest, it is zero.',
      },
      surface: {
        tex: raw`A=4\pi r^2`,
        say: raw`A sphere through $P$, centred on $q$: in the hollow, in the metal, or outside.`,
        line: raw`A sphere through $P$: in the hollow, in the metal, or outside it.`,
        caption: 'Draw a sphere of radius r through P, centred on the charge, and place it in each region: in the hollow, in the metal, and outside the ball.',
      },
      left: {
        tex: raw`\Phi=E_r\,(4\pi r^2)`,
        say: raw`In the metal, where $E_r=0$, the flux is zero.`,
        line: raw`The flux is $E_r(4\pi r^2)$: zero for a sphere in the metal.`,
        caption: 'The left side is E_r times four π r squared in every region. For a sphere in the metal every patch sees no field, and the flux is zero.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=\begin{cases}q, & r<a\\q-q=0, & a<r<b\\q-q+q=q, & r>b\end{cases}`,
        say: raw`Zero flux in the metal forces $q_{\text{wall}}=-q$; the metal is neutral, so $q_{\text{outer}}=+q$.`,
        line: raw`Zero flux in the metal forces $-q$ onto the wall, and $+q$ onto the outside.`,
        caption: 'The right side. In the hollow the sphere holds q. In the metal its flux is zero, so it holds nothing: the hollow’s wall must carry minus q. The metal is neutral, so the plus q left behind sits on the outer surface. Outside, the sphere holds all three: q.',
      },
      solve: {
        tex: raw`E_r=\begin{cases}${POINT}, & r<a\\[6pt]0, & a<r<b\\[4pt]${POINT}, & r>b\end{cases}`,
        answer: raw`E_r=\begin{cases}${POINT}, & r<a\\[6pt]0, & a<r<b\\[4pt]${POINT}, & r>b\end{cases}`,
        say: raw`$q$’s field in the hollow, none in the metal, and $q$’s field again outside.`,
        line: raw`A point charge’s field in the hollow and outside; none in the metal.`,
        caption: 'In the hollow, the field of q. In the metal, none. Outside, the field of q again, now made by the charge on the outer surface. Out from the centre for a positive q, in for a negative one, in both.',
      },
      checks: [
        {title: 'The charges add up', text: raw`The wall’s $-q$ and the outside’s $+q$ add to zero, the metal’s net charge. Give the metal a net $Q$ and the outside carries $Q+q$; the wall still carries $-q$.`},
        {title: 'Off centre', text: raw`Move $q$ off centre in the instrument below: the wall’s $-q$ crowds toward it, but the outside’s charge on the round ball stays even, and the field outside is still $q$’s from the centre.`},
        {title: 'An empty hollow', text: raw`With nothing in the hollow, a sphere in the metal round it encloses nothing, so the wall’s net charge is zero. This hollow is round and centred, so symmetry would spread any wall charge evenly: there is none, and no field in the hollow. The metal shields it.`},
      ],
    },
  ],
  traps: [
    {wrong: raw`Just outside a conductor the field is $\sigma/(2\varepsilon_0)$.`, right: raw`That is a lone sheet’s. Next to a conductor the metal’s side has no field, all the flux leaves through one face, and the field is $\sigma/\varepsilon_0$.`},
    {wrong: 'A charged conductor holds its charge all through its metal.', right: raw`A surface anywhere inside the metal has no flux and encloses nothing: any excess charge is on the surface.`},
    {wrong: 'The metal hides a charge in a hollow from the outside.', right: raw`It hides where the charge is, not how much: the outside carries $+q$ for a charge $q$ in the hollow, plus any net charge of the metal’s own, spread evenly on an isolated round conductor.`},
    {wrong: 'The wall of a hollow is charged evenly.', right: raw`Only when $q$ is at the centre of a round hollow. Off centre the wall’s $-q$ crowds toward it, though it still adds to $-q$.`},
  ],
  instrument: 'cavity',
  next: 'holes',
  related: {field: 'disk', text: raw`A disk of charge, whose field near it is a lone sheet’s $\sigma/(2\varepsilon_0)$: half a conductor’s`},
};
