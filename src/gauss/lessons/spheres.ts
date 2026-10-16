import type {GaussLesson} from '../types';
const raw = String.raw;
/* SPHERES. Every spherical problem has the same left side, 4πr²E_r, and the work is all in the right: each region
 * its own Q_enc. Four cases, all of total charge Q, the three with a size of the same radius R: a point charge
 * (Coulomb's law back out of Gauss's), a thin shell (no field anywhere inside, a point charge's outside, a jump of
 * σ/ε₀ across its surface charge), a uniform ball (E ∝ r inside, continuous at R), and a ball whose density rises as
 * r (E ∝ r² inside). The slider takes the sphere inside each and out of it, and the instrument plots E_r against r
 * for all four at once, the chosen one bold, a line at the slider's r. Every sentence holds for either sign. */
export const lesson: GaussLesson = {
  id: 'spheres',
  title: 'Spheres',
  short: 'Spheres',
  about: 'No field inside a shell, a field that grows inside a ball, a point charge’s outside both.',
  lead: raw`For any charge that depends only on the distance from a centre, the left side of Gauss’s law is always $E_r\,(4\pi r^2)$. Everything else is the charge inside, worked out afresh for each region: inside a shell, inside a ball, outside them all.`,
  sections: [
    {heading: 'One surface for every region', body: [
      raw`Spherical symmetry makes $\vec E$ radial and the same size at the same distance, so a concentric sphere of radius $r$ through $P$ turns the flux integral into the field times the area, wherever $P$ is:`,
      {tex: raw`E_r\,(4\pi r^2)=\frac{Q_{\text{enc}}(r)}{\varepsilon_0}\quad\Rightarrow\quad E_r=\frac{k\,Q_{\text{enc}}(r)}{r^2}`},
      raw`So the field at $r$ is $k$ times the charge inside $r$, over $r^2$, as if that charge sat at the centre, and the charge outside $r$ makes no field there at all: it is a set of shells, and a shell makes none inside it. The whole problem is $Q_{\text{enc}}(r)$, region by region.`,
    ]},
    {heading: 'A point charge, and a thin shell', body: [
      raw`Round a point charge every sphere encloses all of it, and $E_r=kQ/r^2$: Coulomb’s law, out of Gauss’s. The answer is not news. The point is the method: use the flux you know to get the field you want.`,
      raw`A thin shell of radius $R$ carries its charge $Q$ on its surface, $\sigma=Q/4\pi R^2$. A sphere inside it encloses none of that charge, one outside encloses all of it:`,
      {tex: raw`E_r=0\quad(r<R),\qquad E_r=\frac{kQ}{r^2}\quad(r>R)`},
      raw`The field is zero everywhere inside the shell, not just at its centre: the near part of the shell is closer, but there is less of it in each direction, and the two cancel exactly. Across the surface the field jumps from zero to $kQ/R^2$, which is $\sigma/\varepsilon_0$.`,
    ]},
    {heading: 'A uniform ball', body: [
      raw`Spread $Q$ evenly through a ball of radius $R$. Outside, the sphere encloses all of it and the field is a point charge’s. Inside, it encloses the fraction $r^3/R^3$, so`,
      {tex: raw`E_r=\frac{kQ}{r^2}\cdot\frac{r^3}{R^3}=\frac{kQr}{R^3}\quad(r\le R)`},
      raw`The field grows in proportion to $r$ from zero at the centre, peaks at the surface, and falls as $1/r^2$ outside. At $r=R$ the two answers agree, $kQ/R^2$: checking that is a free mark on any exam.`,
    ]},
    {heading: 'A density that grows with r', body: [
      raw`Now let the density rise from zero at the centre, $\rho=\rho_0r/R$, the ball holding $Q$ in all. By thin shells, $Q_{\text{enc}}=\int_0^r\rho_0\frac{r'}{R}\,4\pi r'^2\,dr'=\pi\rho_0r^4/R$, and setting $r=R$ fixes $\rho_0=Q/\pi R^3$:`,
      {tex: raw`Q_{\text{enc}}=Q\,\frac{r^4}{R^4},\qquad E_r=\frac{kQr^2}{R^4}\quad(r\le R)`},
      raw`With less charge near the centre the field starts more slowly, as $r^2$, and still reaches $kQ/R^2$ at the surface.`,
    ]},
    {heading: 'Continuous, or a jump', body: [
      raw`The plot under the figure shows all four at once. Outside $R$ they are one curve: every sphere of charge $Q$ looks like a point charge from outside. Inside they part. Where the charge has a finite density, $Q_{\text{enc}}$ changes smoothly through $R$ and the field is continuous there. Where a finite charge sits on a surface of no thickness, $Q_{\text{enc}}$ steps as the sphere crosses it, and the field jumps by $\sigma/\varepsilon_0$:`,
      {tex: raw`E_r(R^+)-E_r(R^-)=\frac{\sigma}{\varepsilon_0}`},
      raw`So inside and outside answers that do not meet at $R$, for a ball, mean an algebra slip; for a shell, they mean nothing is wrong.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§6.3, Applying Gauss’s Law: a charge distribution with spherical symmetry', url: 'https://openstax.org/books/university-physics-volume-2/pages/6-3-applying-gausss-law'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.2.3, Applications of Gauss’s law: a uniformly charged sphere'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 1, Electrostatics: the field of a spherical shell and of a solid sphere'},
  ],
  cases: [
    {
      key: 'point', label: 'Point charge',
      figure: {charge: {kind: 'point', size: 0, symbol: 'Q', name: 'a point charge'}, surface: {kind: 'sphere', size: {min: .55, max: 2.4, initial: 1.6}, other: 0, label: 'Radius r'}},
      setup: raw`A point charge $Q$ sits alone. Use Gauss’s law to find the field a distance $r$ from it.`,
      symmetry: {
        tex: raw`\vec E=E_r(r)\,\hat{\mathbf r}`,
        say: raw`Every turn about the charge leaves it as it was, so $\vec E$ is radial; $E_r$ is negative where it points in.`,
        line: raw`Every turn about the charge leaves it as it was: $\vec E$ is radial.`,
        caption: 'Any turn about the charge leaves it exactly as it was, so the field points along the radius, out or in, and its size depends only on the distance r.',
      },
      surface: {
        tex: raw`A=4\pi r^2`,
        say: raw`A sphere of radius $r$ through $P$, centred on the charge.`,
        line: raw`A sphere of radius $r$ through $P$, centred on the charge.`,
        caption: 'Draw a sphere of radius r through P, centred on the charge: the field is square to every patch of it and the same size on all of them.',
      },
      left: {
        tex: raw`\Phi=E_r\,(4\pi r^2)`,
        say: raw`$E_r$ is the same on every patch, so the flux is $E_r$ times the area.`,
        line: raw`The flux integral collapses to $E_r$ times the sphere’s area.`,
        caption: 'The left side. E_r is the same on every patch, so it comes out of the integral: the flux is E_r times four π r squared.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=Q`,
        say: raw`Every sphere centred on the charge encloses all of it.`,
        line: raw`Every sphere centred on the charge encloses all of it: $Q$.`,
        caption: 'The right side. The sphere encloses the charge, however big or small it is drawn.',
      },
      solve: {
        tex: raw`E_r\,(4\pi r^2)=\frac{Q}{\varepsilon_0}\;\Rightarrow\;E_r=\frac{Q}{4\pi\varepsilon_0r^2}`,
        answer: raw`E_r=\frac{Q}{4\pi\varepsilon_0r^2}=\frac{kQ}{r^2}`,
        say: raw`Coulomb’s law, out of Gauss’s law.`,
        line: raw`Coulomb’s law, out of Gauss’s law: $E_r=kQ/r^2$.`,
        caption: 'Set the two sides equal and divide by the area: k Q over r squared, Coulomb’s law, pointing out for a positive Q and in for a negative one.',
      },
      checks: [
        {title: 'Coulomb’s law back', text: raw`$Q/4\pi\varepsilon_0r^2$ is $kQ/r^2$, with $k=1/4\pi\varepsilon_0$. Gauss’s law and Coulomb’s law say the same thing about a still charge.`},
        {title: 'The method, not the answer', text: raw`Nothing new came out. What is new is the move: knowing the flux, $Q/\varepsilon_0$, and using symmetry to pull $E_r$ out of it. The other three cases make the same move with harder right sides.`},
        {title: 'Either sign', text: raw`For a negative $Q$, $E_r$ is negative: the field points in.`},
      ],
    },
    {
      key: 'shell', label: 'Thin shell',
      figure: {charge: {kind: 'shell', size: 1.105, symbol: 'Q', name: 'a thin charged shell'}, surface: {kind: 'sphere', size: {min: .45, max: 2.4, initial: 1.75}, other: 0, label: 'Radius r'}},
      setup: raw`A thin spherical shell of radius $R$ carries a charge $Q$ spread evenly over its surface, $\sigma=Q/4\pi R^2$. Find the field a distance $r$ from its centre, inside the shell and outside it.`,
      symmetry: {
        tex: raw`\vec E=E_r(r)\,\hat{\mathbf r}`,
        say: raw`The shell looks the same from every direction about its centre: $\vec E$ is radial, inside and out.`,
        line: raw`Every turn about the centre leaves the shell as it was: $\vec E$ is radial.`,
        caption: 'Any turn about the centre leaves the shell as it was, so the field, inside or outside it, points along the radius, and its size depends only on r.',
      },
      surface: {
        tex: raw`A=4\pi r^2`,
        say: raw`A sphere of radius $r$, concentric with the shell: inside it while $r<R$, round it once $r>R$.`,
        line: raw`A sphere concentric with the shell, inside it or round it.`,
        caption: 'Draw a sphere of radius r, concentric with the shell, through P. Drag it inside the shell or out past it.',
      },
      left: {
        tex: raw`\Phi=E_r\,(4\pi r^2)`,
        say: raw`The same left side in both regions.`,
        line: raw`In either region the flux is $E_r$ times $4\pi r^2$.`,
        caption: 'The left side is E_r times four π r squared, inside the shell or outside it.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=\begin{cases}0, & r<R\\[4pt]Q, & r>R\end{cases}`,
        say: raw`All the charge sits at $R$: a sphere inside the shell encloses none of it, one outside encloses all.`,
        line: raw`All the charge is at $R$: none inside the shell, all of it outside.`,
        caption: 'The right side. All the shell’s charge is on its surface. A sphere inside the shell encloses none of it; a sphere outside encloses all of it.',
      },
      solve: {
        tex: raw`E_r=\frac{Q_{\text{enc}}}{4\pi\varepsilon_0r^2}=\begin{cases}0, & r<R\\[6pt]\dfrac{kQ}{r^2}, & r>R\end{cases}`,
        answer: raw`E_r=\begin{cases}0, & r<R\\[6pt]\dfrac{kQ}{r^2}, & r>R\end{cases}`,
        say: raw`No field anywhere inside the shell, not only at its centre; outside, a point charge’s.`,
        line: raw`No field anywhere inside the shell; outside, a point charge’s field.`,
        caption: 'Divide by four π ε₀ r squared. Inside the shell the field is zero, at every point, not only the centre. Outside it is k Q over r squared, as if all the charge sat at the centre.',
      },
      checks: [
        {title: 'The jump at the shell', text: raw`Just outside, $E_r=kQ/R^2$; just inside, zero. With $\sigma=Q/4\pi R^2$ the jump is $\sigma/\varepsilon_0$, as it is across any surface charge.`, tex: raw`E_r(R^+)-E_r(R^-)=\frac{kQ}{R^2}=\frac{\sigma}{\varepsilon_0}`},
        {title: 'Zero, not just no flux', text: raw`Zero flux through a sphere inside would allow a field going in on one side and out on the other. Symmetry rules that out: the field is radial and the same all over the sphere, so zero flux means zero field at every point of it.`},
        {title: 'Either sign', text: raw`For a negative $Q$ the outside field points in. Inside it is zero either way.`},
      ],
    },
    {
      key: 'ball', label: 'Uniform ball',
      figure: {charge: {kind: 'ball', size: 1.1, symbol: 'Q', name: 'a uniformly charged ball'}, surface: {kind: 'sphere', size: {min: .35, max: 2.4, initial: .8}, other: 0, label: 'Radius r'}},
      setup: raw`A ball of radius $R$ holds a charge $Q$ spread evenly through its volume. Find the field a distance $r$ from its centre, inside the ball and outside it.`,
      symmetry: {
        tex: raw`\vec E=E_r(r)\,\hat{\mathbf r}`,
        say: raw`The ball is unchanged by every turn about its centre: $\vec E$ is radial, inside and out.`,
        line: raw`Every turn about the centre leaves the ball as it was: $\vec E$ is radial.`,
        caption: 'Any turn about its centre leaves the ball as it was, so the field points along the radius, inside it and outside, its size set by r alone.',
      },
      surface: {
        tex: raw`A=4\pi r^2`,
        say: raw`A sphere of radius $r$ through $P$, concentric with the ball: cutting through it while $r<R$.`,
        line: raw`A sphere through $P$, concentric with the ball, cutting through it or round it.`,
        caption: 'Draw a sphere of radius r through P, concentric with the ball. Inside the ball it cuts through the charge; it is imaginary, so that is allowed.',
      },
      left: {
        tex: raw`\Phi=E_r\,(4\pi r^2)`,
        say: raw`The same left side in both regions.`,
        line: raw`In either region the flux is $E_r$ times $4\pi r^2$.`,
        caption: 'The left side is E_r times four π r squared, in both regions.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=\begin{cases}\displaystyle\int_0^{r}\rho\,4\pi r'^2\,dr'=Q\,\frac{r^3}{R^3}, & r\le R\\[8pt]Q, & r\ge R\end{cases}`,
        say: raw`$\rho=Q/\frac43\pi R^3$ is the same in every thin shell, so the shells out to $r$ hold $\rho\,\frac43\pi r^3$. Outside, all of $Q$.`,
        line: raw`Inside, the shells out to $r$ hold $Qr^3/R^3$; outside, all of $Q$.`,
        caption: 'The right side. Inside the ball the sphere encloses the thin shells out to r, which hold Q times r cubed over R cubed. Outside it encloses the whole ball, Q.',
      },
      solve: {
        tex: raw`E_r=\frac{Q_{\text{enc}}}{4\pi\varepsilon_0r^2}=\begin{cases}\dfrac{kQr}{R^3}, & r\le R\\[6pt]\dfrac{kQ}{r^2}, & r\ge R\end{cases}`,
        answer: raw`E_r=\begin{cases}\dfrac{kQr}{R^3}, & r\le R\\[6pt]\dfrac{kQ}{r^2}, & r\ge R\end{cases}`,
        say: raw`Inside, the field grows in proportion to $r$; outside it falls as $1/r^2$. Both give $kQ/R^2$ at $r=R$.`,
        line: raw`Inside, $E_r$ grows as $r$; outside, it falls as $1/r^2$; they meet at $R$.`,
        caption: 'Divide by four π ε₀ r squared in each region. Inside, the field grows in proportion to r from zero at the centre; outside, it falls as one over r squared. Both give k Q over R squared at the surface.',
      },
      checks: [
        {title: 'Continuous at R', text: raw`Inside at $r=R$: $kQR/R^3=kQ/R^2$, the outside value. With a finite density no charge sits on the surface itself, so the field cannot jump there.`},
        {title: 'Zero at the centre', text: raw`At $r=0$ the sphere encloses nothing, and $E_r=0$: by symmetry the centre has no direction to point in.`},
        {title: 'Either sign', text: raw`For a negative $Q$, $E_r$ is negative throughout: the field points in, strongest at the surface.`},
      ],
    },
    {
      key: 'rising', label: 'Rising density',
      figure: {charge: {kind: 'rising', size: 1.1, symbol: 'Q', name: 'a ball whose density rises with r'}, surface: {kind: 'sphere', size: {min: .35, max: 2.4, initial: .8}, other: 0, label: 'Radius r'}},
      setup: raw`A ball of radius $R$ holds a total charge $Q$, with a density that rises from zero at its centre, $\rho=\rho_0r/R$. Find the field inside the ball and outside it.`,
      symmetry: {
        tex: raw`\vec E=E_r(r)\,\hat{\mathbf r}`,
        say: raw`The density depends only on $r$, so every turn about the centre leaves the ball as it was: $\vec E$ is radial.`,
        line: raw`The density depends only on $r$: $\vec E$ is still radial.`,
        caption: 'The density changes with r but not with direction, so every turn about the centre leaves the ball as it was. The field is radial, its size set by r.',
      },
      surface: {
        tex: raw`A=4\pi r^2`,
        say: raw`A sphere of radius $r$ through $P$, concentric with the ball.`,
        line: raw`A sphere through $P$, concentric with the ball, inside it or round it.`,
        caption: 'Draw a sphere of radius r through P, concentric with the ball, inside it or round it.',
      },
      left: {
        tex: raw`\Phi=E_r\,(4\pi r^2)`,
        say: raw`The same left side: the density changes only the right.`,
        line: raw`The left side is $E_r$ times $4\pi r^2$, as for any sphere.`,
        caption: 'The left side is E_r times four π r squared, as for every sphere in this lesson.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=\int_0^{r}\rho_0\frac{r'}{R}\,4\pi r'^2\,dr'=\frac{\pi\rho_0r^4}{R}=Q\,\frac{r^4}{R^4}`,
        say: raw`At $r=R$ the same integral is $\pi\rho_0R^3$, which must be $Q$: so $\rho_0=Q/\pi R^3$. For $r\ge R$ the shells stop at $R$, and $Q_{\text{enc}}=Q$.`,
        line: raw`Thin shells out to $r$: $Q_{\text{enc}}=Qr^4/R^4$ inside, all of $Q$ outside.`,
        caption: 'The right side, by thin shells. Each holds ρ₀ r prime over R times four π r prime squared d r prime; out to r they hold Q times r to the fourth over R to the fourth, with ρ₀ fixed by the whole ball holding Q. Outside, all of Q.',
      },
      solve: {
        tex: raw`E_r=\frac{Q_{\text{enc}}}{4\pi\varepsilon_0r^2}=\begin{cases}\dfrac{kQr^2}{R^4}, & r\le R\\[6pt]\dfrac{kQ}{r^2}, & r\ge R\end{cases}`,
        answer: raw`E_r=\begin{cases}\dfrac{kQr^2}{R^4}, & r\le R\\[6pt]\dfrac{kQ}{r^2}, & r\ge R\end{cases}`,
        say: raw`Inside, the field grows as $r^2$; at $r=R$ it is $kQ/R^2$, the outside value.`,
        line: raw`Inside, $E_r$ grows as $r^2$; at $R$ it meets the outside field.`,
        caption: 'Divide by four π ε₀ r squared. Inside, the field grows as r squared, more slowly than in a uniform ball at first, since less charge lies near the centre. At the surface both answers give k Q over R squared.',
      },
      checks: [
        {title: 'Continuous at R', text: raw`Inside at $r=R$: $kQR^2/R^4=kQ/R^2$, the outside value.`},
        {title: 'Slower at first', text: raw`Near the centre $E_r\propto r^2$, smaller in size than the uniform ball’s $kQr/R^3$ all the way in, because the rising density puts less of the charge near the centre.`},
        {title: 'The integral agrees', text: raw`Far away every sphere here looks like a point charge, $kQ/r^2$, and so does every finite charge whose total is not zero: the Ring lesson’s field on its axis, added up piece by piece, falls to $kQ/z^2$ far out, and so does the Disk lesson’s.`},
        {title: 'Either sign', text: raw`For a negative $Q$, $E_r$ is negative in both regions: the field points in.`},
      ],
    },
  ],
  traps: [
    {wrong: 'Inside a shell the field is zero only at the centre.', right: raw`It is zero at every point inside. The sphere through any inner point encloses no charge, and symmetry makes the field the same all over that sphere, so it must be zero there.`},
    {wrong: 'Inside a ball, the field is the whole ball’s, kQ over r squared.', right: raw`Only the charge inside $r$ counts: $Q_{\text{enc}}=Qr^3/R^3$ for a uniform ball, and the field grows as $r$, falling to zero at the centre.`},
    {wrong: 'The field must be continuous at R for every sphere.', right: raw`For a finite density, yes. Across a surface charge it jumps by $\sigma/\varepsilon_0$: zero just inside a shell, $kQ/R^2$ just outside.`},
  ],
  instrument: 'plot',
  next: 'lines',
  related: {field: 'ring', text: 'The ring, added up piece by piece: far away its field is a point charge’s too'},
};
