import type {GaussLesson} from '../types';
const raw = String.raw;
/* LINES AND CYLINDERS. The cylindrical half of the recipe: a coaxial cylinder of any length L, whose ends carry no
 * flux and whose wall carries E_r·2πrL, so L cancels every time. Four cases, in the order the owner's study guide
 * builds them: the infinite line (checked against the integral the reader built, 2kλ/r), a solid rod of uniform
 * charge (the field grows as r inside and falls as 1/r outside, meeting at R), a thin cylindrical shell (no field
 * inside, the line's outside), and two coaxial shells carrying λ and −λ (the field lives only between them). The
 * slider takes the surface through each region; the profile under the figure plots the field at P for every
 * radius at once. Every sentence holds for either sign: E_r is the signed part along r̂, negative where the field
 * points in. */
/** The field drawn at the standard arrow length in every case: the line's at the opening radius (k = 1, unit λ).
 * One scale for the lesson, so the rod's field outside is drawn as long as the line's and the shell's. Every
 * shell sits off the slider's grid of hundredths, so the surface never lies exactly on a surface charge. */
const REFERENCE = 2 / 1.4;
const LINE_FIELD = raw`E_r=\frac{\lambda}{2\pi\varepsilon_0r}`;
export const lesson: GaussLesson = {
  id: 'lines',
  title: 'Lines and cylinders',
  short: 'Lines and cylinders',
  about: 'A cylinder round a line or a thick rod, checked against the integral you built.',
  lead: raw`Round anything long, straight and the same all along, draw a cylinder on the same axis. Its ends carry no flux, its wall carries $E_r$ times $2\pi rL$, and the length $L$ you chose cancels: the field of a line in two steps, and of a rod, a shell or a cable in a few more.`,
  sections: [
    {heading: 'The surface is forced, its length is not', body: [
      raw`For a sphere the surface had to be a sphere. Here the shape is forced as well: the charge depends only on the distance $r$ from an axis and runs on for ever along it, so the field points straight out from the axis (or straight in) and its size can depend only on $r$. The surface that matches is a cylinder on the same axis, through $P$. Its length $L$ is yours to choose, and because you chose it, it has to cancel.`,
      raw`On the curved wall $\vec E$ is square to every patch and has the same $E_r$ on all of them. On the two flat ends $\vec E$ lies along the surface. So the left side is the same for every case in this lesson:`,
      {tex: raw`\oint\vec E\cdot d\vec A=E_r\,(2\pi rL)+0+0`},
    ]},
    {heading: 'A line, again', body: [
      raw`An infinite line with $\lambda$ per unit length puts a charge $\lambda L$ inside a cylinder of length $L$, wherever its radius. Setting $E_r(2\pi rL)=\lambda L/\varepsilon_0$ gives the field you built in the Infinite line lesson by adding the line up piece by piece, with $k=1/(4\pi\varepsilon_0)$:`,
      {tex: raw`E_r=\frac{\lambda}{2\pi\varepsilon_0 r}=\frac{2k\lambda}{r}`},
      raw`There the cancelling pairs of pieces did the work of showing that only the part straight out survives. Here the flips of Symmetry first did it, before any calculation.`,
    ]},
    {heading: 'A solid rod: where the integral lives', body: [
      raw`Spread the same $\lambda$ evenly through a rod of radius $R$, so its density is $\rho=\lambda/(\pi R^2)$. Outside, the cylinder holds all of a length $L$ of rod, $\lambda L$, and the field is the line’s again: from outside, the rod cannot be told from a line. Inside, the cylinder holds only the core within $r$. Cut that core into thin cylindrical shells of radius $r'$ and thickness $dr'$, each of volume $2\pi r'L\,dr'$, and add them up to $r$, not to $R$:`,
      {tex: raw`Q_{\text{enc}}=\int_0^{r}\rho\,2\pi r'L\,dr'=\pi\rho Lr^2=\lambda L\frac{r^2}{R^2}`},
      raw`Then $E_r=\lambda r/(2\pi\varepsilon_0R^2)$: zero on the axis, growing in step with $r$, and meeting the outside answer exactly at $r=R$. The inside and outside answers must meet there, since the rod has no surface charge; if yours do not, something is wrong, most often an upper limit.`,
    ]},
    {heading: 'A shell, and a cable', body: [
      raw`Put the charge on a thin cylindrical shell of radius $R$ instead. A cylinder inside it encloses nothing, so $E_r(2\pi rL)=0$, and since $E_r$ is the same all over the wall, it is zero: no field anywhere inside. Outside, the line’s field again. Crossing the shell the field jumps, by $\lambda/(2\pi\varepsilon_0R)$, which is $\sigma/\varepsilon_0$ for the shell’s $\sigma=\lambda/(2\pi R)$: the same jump every surface charge makes.`,
      raw`A coaxial cable is two such shells on one axis, the inner one carrying $\lambda$ and the outer one $-\lambda$. Place the cylinder in each region in turn. Inside both it encloses nothing; between them, $\lambda L$; outside both, $\lambda L-\lambda L=0$. So the field lives only between the conductors, and outside the cable there is none at all, which is one reason cables are built this way.`,
    ]},
    {heading: 'Only when it is long', body: [
      raw`Every step leaned on the charge going on for ever. Near the end of a finite rod the field tilts off the radial, gaining a part along the axis, its size changes along the wall, and the ends of the cylinder catch flux. Gauss’s law is still true there, but it no longer hands you $\vec E$. Treat a rod as infinite only when it is long compared with your distance from it and you are far from its ends; otherwise, build the integral.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§6.3, Applying Gauss’s Law: systems with cylindrical symmetry', url: 'https://openstax.org/books/university-physics-volume-2/pages/6-3-applying-gausss-law'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.2.3, Applications of Gauss’s law: the long cylinder'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics: the field of a line charge by Gauss’s law'},
  ],
  cases: [
    {
      key: 'line', label: 'Line',
      figure: {charge: {kind: 'line', size: 0, symbol: raw`\lambda`, name: 'an infinite line of charge'}, surface: {kind: 'cylinder', size: {min: .6, max: 2.4, initial: 1.4}, other: 1.1, label: 'Radius r'}, reference: REFERENCE},
      setup: raw`An infinite straight line carries a charge $\lambda$ per unit length. Find the field a distance $r$ from it, and compare it with the field you built from the line’s pieces.`,
      symmetry: {
        tex: raw`\vec E=E_r(r)\,\hat{\mathbf r}`,
        say: raw`$\hat{\mathbf r}$ points straight out from the line; $E_r$ is negative where the field points in.`,
        line: raw`Flips that leave the line as it was forbid any part along it or round it.`,
        caption: 'A mirror square to the line leaves it unchanged but would reverse any part of the field along it, and a mirror containing it would reverse any swirl round it. So the field points straight out from the line, or straight in. Turning about the line and sliding along it change nothing, so its size depends only on the distance r.',
      },
      surface: {
        tex: raw`A_{\text{wall}}=2\pi rL`,
        say: raw`A cylinder of radius $r$ and any length $L$, on the line, through $P$.`,
        line: raw`A cylinder on the line, through $P$, of any length $L$ you like.`,
        caption: 'Draw a cylinder of radius r through P with the line as its axis. Its length L is your choice. On its curved wall the field is square to every patch and the same size; on its two flat ends the field lies along the surface.',
      },
      left: {
        tex: raw`\Phi=E_r\,(2\pi rL)+0+0`,
        say: raw`The wall carries $E_r$ times its area; on the ends $\vec E\cdot d\vec A=0$, patch by patch.`,
        line: raw`The wall carries $E_r$ times its area; the two ends carry nothing.`,
        caption: 'The left side. Every patch of the wall carries E_r times its area, so the wall carries E_r times two π r L. On the ends the field runs along the surface, square to dA, so each of their patches carries nothing.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=\lambda L`,
        say: raw`Only the length $L$ of line inside the cylinder counts.`,
        line: raw`Inside is a length $L$ of line, holding $\lambda L$.`,
        caption: 'The right side. The cylinder encloses the length L of the line that runs through it, and so a charge λ L. The rest of the line is outside: it adds nothing to the flux, though it is why the field is the same all along the wall.',
      },
      solve: {
        tex: raw`E_r\,(2\pi rL)=\frac{\lambda L}{\varepsilon_0}\;\Rightarrow\;${LINE_FIELD}`,
        answer: raw`${LINE_FIELD}=\frac{2k\lambda}{r}`,
        say: raw`$L$ cancels. With $k=1/(4\pi\varepsilon_0)$ this is the integral lesson’s $2k\lambda/r$.`,
        line: raw`$L$ cancels, and the answer is the integral lesson’s $2k\lambda/r$.`,
        caption: 'Set the two sides equal and divide by two π r L. The length cancels, as it must for a surface you chose. The field falls as one over r, out from the line for a positive λ and in for a negative one, and it is exactly the two k λ over r the Infinite line lesson built from the line’s pieces.',
      },
      checks: [
        {title: 'The integral agrees', text: raw`The Infinite line lesson added the line up piece by piece and found $2k\lambda/r$. Gauss’s law found $\lambda/(2\pi\varepsilon_0r)$. With $k=1/(4\pi\varepsilon_0)$ they are the same field:`, tex: raw`\frac{2k\lambda}{r}=\frac{2}{4\pi\varepsilon_0}\,\frac{\lambda}{r}=\frac{\lambda}{2\pi\varepsilon_0r}`},
        {title: 'The length cancels', text: raw`$L$ appears on both sides and leaves no trace. An answer with $L$ in it would depend on an imaginary surface: an algebra slip, every time.`},
        {title: 'Why one over r', text: raw`A wider cylinder of the same length holds the same charge, but its wall grows as $r$, so the field must fall as $1/r$: more slowly than a point charge’s $1/r^2$, whose sphere grows as $r^2$.`},
      ],
    },
    {
      key: 'rod', label: 'Solid rod',
      figure: {charge: {kind: 'rod', size: 1, symbol: raw`\lambda`, name: 'a long solid rod of charge', bounds: ['R']}, surface: {kind: 'cylinder', size: {min: .35, max: 2.4, initial: .7}, other: 1.1, label: 'Radius r',
        regions: [
          {name: 'inside the rod', tex: raw`E_r=\frac{\lambda r}{2\pi\varepsilon_0R^2}`, say: raw`Inside the rod the cylinder holds the fraction $r^2/R^2$ of the charge, and the field grows in step with $r$.`},
          {name: 'outside the rod', tex: raw`E_r=\frac{\lambda}{2\pi\varepsilon_0r}`, say: raw`Outside, the cylinder holds the whole of a length $L$ of rod, and the field is a line’s.`},
        ]}, reference: REFERENCE},
      setup: raw`A long solid rod of radius $R$ carries a charge $\lambda$ per unit length, spread evenly through it. Find the field a distance $r$ from its axis, inside the rod and outside it.`,
      symmetry: {
        tex: raw`\vec E=E_r(r)\,\hat{\mathbf r}`,
        say: raw`The rod is a thick line: the same flips leave it as it was, inside and out.`,
        line: raw`A thick line is still a line: the field points straight out from the axis.`,
        caption: 'The rod is unchanged by the same flips and turns as a line, so its field, inside the rod and outside it, points straight out from the axis or straight in, and its size depends only on the distance r.',
      },
      surface: {
        tex: raw`A_{\text{wall}}=2\pi rL`,
        say: raw`A coaxial cylinder through $P$: inside the rod or outside it, the same shape of surface.`,
        line: raw`A coaxial cylinder through $P$, inside the rod or outside it.`,
        caption: 'Draw a cylinder on the rod’s axis through P, of length L. Inside the rod or outside it, the field is square to its wall and the same all over it, and lies along its ends.',
      },
      left: {
        tex: raw`\Phi=E_r\,(2\pi rL)`,
        say: raw`The left side is the same in both regions; only the right side changes.`,
        line: raw`The wall carries $E_r(2\pi rL)$ in either region; the ends carry nothing.`,
        caption: 'The left side is E_r times two π r L, in either region. The ends carry nothing. What changes from inside to outside is only how much charge the cylinder holds.',
      },
      right: {
        tex: raw`\begin{aligned}Q_{\text{enc}}&=\int_0^{r}\rho\,2\pi r'L\,dr'\\&=\lambda L\,\frac{r^2}{R^2}\quad(r\le R)\\Q_{\text{enc}}&=\lambda L\quad(r\ge R)\end{aligned}`,
        say: raw`$\rho=\lambda/(\pi R^2)$. Inside, add thin shells of volume $2\pi r'L\,dr'$ up to $r$; outside, the integral stops at $R$.`,
        line: raw`Inside, only the core within $r$ counts; outside, all of $\lambda L$.`,
        caption: 'The right side. Inside the rod, add up thin cylindrical shells of the core out to r: that is the fraction r squared over R squared of the charge, λ L r squared over R squared. Outside, the integral stops at R, and the cylinder holds all of λ L.',
      },
      solve: {
        tex: raw`E_r=\begin{cases}\dfrac{\lambda r}{2\pi\varepsilon_0R^2}, & r\le R\\[6pt]\dfrac{\lambda}{2\pi\varepsilon_0r}, & r\ge R\end{cases}`,
        answer: raw`E_r=\begin{cases}\dfrac{\lambda r}{2\pi\varepsilon_0R^2}, & r\le R\\[6pt]\dfrac{\lambda}{2\pi\varepsilon_0r}, & r\ge R\end{cases}`,
        say: raw`Growing in step with $r$ inside, falling as $1/r$ outside; $L$ cancels in both.`,
        line: raw`Inside it grows as $r$; outside it falls as $1/r$; they meet at $R$.`,
        caption: 'Set the sides equal in each region and divide by two π r L. Inside, the field grows in step with r, from zero on the axis. Outside, it is the line’s field, falling as one over r. Both point out for a positive λ and in for a negative one.',
      },
      checks: [
        {title: 'They meet at the surface', text: raw`At $r=R$ both answers give $\lambda/(2\pi\varepsilon_0R)$. A charge spread through a volume has no surface charge, so the field cannot jump; if your two answers disagree at $R$, something is wrong, most often an upper limit.`},
        {title: 'Zero on the axis', text: raw`At $r=0$ the cylinder holds nothing and the field is zero, as it must be: on the axis no direction out is special.`},
        {title: 'Rod against ball', text: raw`Inside a uniform rod $E_r=\rho r/(2\varepsilon_0)$; inside a uniform ball, $\rho r/(3\varepsilon_0)$. A two for a cylinder, a three for a sphere: the powers of $r$ in their volumes.`},
      ],
    },
    {
      key: 'tube', label: 'Shell',
      figure: {charge: {kind: 'tube', size: 1.005, symbol: raw`\lambda`, name: 'a long thin cylindrical shell of charge', bounds: ['R']}, surface: {kind: 'cylinder', size: {min: .4, max: 2.4, initial: .6}, other: 1.1, label: 'Radius r',
        regions: [
          {name: 'inside the shell', tex: raw`E_r=0`, say: raw`Inside, the cylinder encloses no charge, so the field is zero everywhere in the hollow.`},
          {name: 'outside the shell', tex: raw`E_r=\frac{\lambda}{2\pi\varepsilon_0r}`, say: raw`Outside, the cylinder holds a length $L$ of shell, and the field is a line’s.`},
        ]}, reference: REFERENCE},
      setup: raw`A long thin cylindrical shell of radius $R$ carries a charge $\lambda$ per unit length on its surface. Find the field inside it and outside it.`,
      symmetry: {
        tex: raw`\vec E=E_r(r)\,\hat{\mathbf r}`,
        say: raw`The shell is round and goes on for ever, so it has the line’s symmetries.`,
        line: raw`The shell has the line’s symmetries: the field points straight out, or in.`,
        caption: 'The shell is unchanged by turns about its axis, slides along it and the same flips as a line, so inside and outside the field points straight out from the axis or straight in, with a size that depends only on r.',
      },
      surface: {
        tex: raw`A_{\text{wall}}=2\pi rL`,
        say: raw`A coaxial cylinder through $P$, inside the shell or outside it.`,
        line: raw`A coaxial cylinder through $P$, inside the shell or outside it.`,
        caption: 'Draw a cylinder on the shell’s axis through P, inside the shell or outside it. Its wall has the field square to it and the same all over; its ends have the field along them.',
      },
      left: {
        tex: raw`\Phi=E_r\,(2\pi rL)`,
        say: raw`The wall carries $E_r$ times its area; the ends carry nothing.`,
        line: raw`The wall carries $E_r(2\pi rL)$, in either region.`,
        caption: 'The left side is E_r times two π r L, inside or outside. The ends carry nothing.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=\begin{cases}0, & r<R\\\lambda L, & r>R\end{cases}`,
        say: raw`The shell’s charge is all at $R$: a cylinder inside it holds none of it.`,
        line: raw`Inside the shell nothing is enclosed; outside, $\lambda L$.`,
        caption: 'The right side. All of the shell’s charge is on its surface, at R. A cylinder inside encloses none of it; a cylinder outside encloses a length L of shell, holding λ L.',
      },
      solve: {
        tex: raw`E_r=\begin{cases}0, & r<R\\[4pt]\dfrac{\lambda}{2\pi\varepsilon_0r}, & r>R\end{cases}`,
        answer: raw`E_r=\begin{cases}0, & r<R\\[4pt]\dfrac{\lambda}{2\pi\varepsilon_0r}, & r>R\end{cases}`,
        say: raw`Inside, $E_r(2\pi rL)=0$ and $E_r$ is the same all over the wall, so it is zero.`,
        line: raw`No field inside the shell; a line’s field outside it.`,
        caption: 'Inside, E_r times the wall’s area is zero, and since E_r is the same all over the wall, E_r is zero: no field anywhere in the hollow. Outside, the field of a line, out for a positive λ and in for a negative one.',
      },
      checks: [
        {title: 'The jump is sigma over epsilon nought', text: raw`Crossing the shell the field jumps from $0$ to $\lambda/(2\pi\varepsilon_0R)$. The shell’s surface density is $\sigma=\lambda/(2\pi R)$, so the jump is $\sigma/\varepsilon_0$, the same jump as across a flat sheet:`, tex: raw`E_r(R^+)-E_r(R^-)=\frac{\lambda}{2\pi\varepsilon_0R}=\frac{\sigma}{\varepsilon_0}`},
        {title: 'Zero flux, and here zero field', text: raw`Zero flux alone does not mean zero field. It does here because symmetry already said $E_r$ is the same at every patch of the wall: a sum of equal pieces that is zero has every piece zero.`},
        {title: 'Given sigma instead', text: raw`If a problem gives the shell’s $\sigma$, the charge inside is $\sigma\,(2\pi RL)$ and the field outside is $\sigma R/(\varepsilon_0r)$: the same field, written in what you were given.`},
      ],
    },
    {
      key: 'coax', label: 'Coaxial',
      figure: {charge: {kind: 'coax', size: .805, outer: 1.705, symbol: raw`\lambda`, name: 'two coaxial cylindrical shells, carrying opposite charges', bounds: ['a', 'b']}, surface: {kind: 'cylinder', size: {min: .4, max: 2.4, initial: 1.25}, other: 1.1, label: 'Radius r',
        regions: [
          {name: 'inside both shells', tex: raw`E_r=0`, say: raw`Inside both shells the cylinder encloses nothing: no field.`},
          {name: 'between the shells', tex: raw`E_r=\frac{\lambda}{2\pi\varepsilon_0r}`, say: raw`Between the shells the cylinder holds only the inner one’s $\lambda L$: a line’s field.`},
          {name: 'outside both shells', tex: raw`E_r=0`, say: raw`Outside both it holds $\lambda L-\lambda L=0$, and there is no field: the cable’s field stays inside it.`},
        ]}, reference: REFERENCE},
      setup: raw`A coaxial cable: a thin cylindrical shell of radius $a$ carrying $\lambda$ per unit length, inside a second one of radius $b$ carrying $-\lambda$, on the same axis. Find the field in each region.`,
      symmetry: {
        tex: raw`\vec E=E_r(r)\,\hat{\mathbf r}`,
        say: raw`Both shells share an axis, so together they have a line’s symmetries.`,
        line: raw`Two shells on one axis keep the line’s symmetries: the field is radial.`,
        caption: 'Each shell is unchanged by turns about the common axis, slides along it and the line’s flips, and so is the pair. The field points straight out or straight in, with a size that depends only on r.',
      },
      surface: {
        tex: raw`A_{\text{wall}}=2\pi rL`,
        say: raw`One coaxial cylinder through $P$, placed in each of the three regions in turn.`,
        line: raw`A coaxial cylinder through $P$, placed in each of the three regions.`,
        caption: 'Draw a cylinder on the axis through P, and place it in each region in turn: inside both shells, between them, and outside both.',
      },
      left: {
        tex: raw`\Phi=E_r\,(2\pi rL)`,
        say: raw`The same left side in every region.`,
        line: raw`The wall carries $E_r(2\pi rL)$ in every region; the ends, nothing.`,
        caption: 'The left side is E_r times two π r L in every region, and the ends carry nothing.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=\begin{cases}0, & r<a\\\lambda L, & a<r<b\\\lambda L-\lambda L=0, & r>b\end{cases}`,
        say: raw`Count only the shells inside the cylinder, each with its sign.`,
        line: raw`Inside both, nothing; between, $\lambda L$; outside both, $\lambda L-\lambda L$.`,
        caption: 'The right side. Inside both shells the cylinder encloses nothing. Between them it encloses the inner shell’s λ L. Outside both it encloses λ L and minus λ L, which add to zero.',
      },
      solve: {
        tex: raw`E_r=\begin{cases}0, & r<a\\[4pt]\dfrac{\lambda}{2\pi\varepsilon_0r}, & a<r<b\\[8pt]0, & r>b\end{cases}`,
        answer: raw`E_r=\begin{cases}0, & r<a\\[4pt]\dfrac{\lambda}{2\pi\varepsilon_0r}, & a<r<b\\[8pt]0, & r>b\end{cases}`,
        say: raw`The field lives only between the shells.`,
        line: raw`The field lives only between the shells; outside the cable there is none.`,
        caption: 'Divide by two π r L in each region. Inside both shells and outside both, there is no field. Between them, the inner shell’s field alone, the field of a line, pointing from the shell with the positive charge toward the one with the negative.',
      },
      checks: [
        {title: 'Shielded outside', text: raw`Outside the cable the enclosed charge adds to zero and so, by symmetry, does the field: the cable’s field is shut inside it. A cylinder enclosing zero net charge has zero field here only because $E_r$ is the same all over its wall.`},
        {title: 'Two jumps', text: raw`The field jumps by $\lambda/(2\pi\varepsilon_0a)$ crossing the inner shell and by $-\lambda/(2\pi\varepsilon_0b)$ crossing the outer one: $\sigma/\varepsilon_0$ for each shell’s own $\sigma$, with its sign.`},
        {title: 'The outer shell does nothing inside', text: raw`Between the shells the field is the inner shell’s alone. The outer shell is there, but a cylinder inside it encloses none of its charge, exactly as for the single shell.`},
      ],
    },
  ],
  traps: [
    {wrong: 'A cylinder works for any rod.', right: raw`Only for one long enough to treat as infinite. Near a finite rod’s ends the field leans, its size changes along the wall and the ends catch flux, so Gauss’s law will not give $\vec E$.`},
    {wrong: raw`The answer may keep an $L$ in it.`, right: raw`$L$ is the length of a surface you chose. It is on both sides and must cancel; one left over is an algebra slip.`},
    {wrong: 'The ends of the cylinder carry flux.', right: raw`The field points straight out from the axis, so it lies along the flat ends and $\vec E\cdot d\vec A=0$ on every patch of them.`},
    {wrong: 'Inside a charged rod the field is zero.', right: raw`Only inside a hollow shell, or a metal rod. Inside a solid rod of charge a cylinder still encloses the core within $r$, and the field grows in step with $r$.`},
  ],
  instrument: 'profile',
  next: 'sheets',
  related: {field: 'infinite', text: 'The same line, added up piece by piece'},
  alongside: {field: 'infinite', text: raw`The same $2k\lambda/r$, built piece by piece from the line’s charge`},
};
