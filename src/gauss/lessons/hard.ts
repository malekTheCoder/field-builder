import type {GaussLesson} from '../types';
const raw = String.raw;
/* THE HARD CASES. The same recipe with a harder right side, the problems the owner's study guide puts last: charge
 * that runs on for ever (a halo whose density falls as 1/r² far out, so slowly that the charge inside grows without
 * end and the field falls only as 1/r), a density that blows up at the centre (ρ = β/r: the charge inside is finite and
 * the field is the same size everywhere inside), running the law backwards (a field given, the density found from
 * Q_enc(r) = 4πε₀r²E), and a slab whose density changes sign (ρ = ρ₀z/a), where the symmetric pillbox gives nothing
 * and a pillbox with one face below the slab, where there is no field, gives everything. A flux integral that has to
 * be done is worked in the lesson text. The profile under the figure plots each field against r or z. Every sentence
 * holds for either sign. */
/** The field drawn at the standard arrow length in every case, one scale for all four (k = 1): the halo's ρ₀ = 1,
 * the cusp's β = ½, the backwards ball's total charge 3, the slab's ρ₀ = 0.375. The slab's is set so its arrows, which
 * point toward its middle on one side, never reach past the face where they would turn round: no arrow is cut short
 * and none is held to the figure's longest, so equal fields are drawn equal across the cases. */
const REFERENCE = 3;
export const lesson: GaussLesson = {
  id: 'hard',
  title: 'The hard cases',
  short: 'The hard cases',
  about: 'Charge out to infinity, densities that blow up, and running Gauss’s law backwards.',
  lead: raw`The same five steps, with a harder right side: charge with no edge, a density that blows up, a field given and the charge to find, a slab whose charge changes sign. Write the left side first; it is the easy half, and then all your attention can go to $Q_{\text{enc}}$.`,
  sections: [
    {heading: 'Charge with no edge', body: [
      raw`When the charge runs on for ever, however large the sphere, there is charge beyond it, and $Q_{\text{enc}}(r)$ is one integral for all $r$. Whether its limit is finite depends on how fast $|\rho|$ falls. A density like $\rho_0e^{-r/a}$ tends to zero fast enough, and far away its field is a point charge’s. The halo here, $\rho=\rho_0a^2/(r^2+a^2)$, does not: far out its magnitude falls only as $1/r^2$, each shell of thickness $dr$ holds about $4\pi\rho_0a^2\,dr$, and the enclosed charge is approximately proportional to $r$:`,
      {tex: raw`\begin{aligned}Q_{\text{enc}}&=\int_0^r\frac{\rho_0a^2}{r'^2+a^2}\,4\pi r'^2\,dr'\\&=4\pi\rho_0a^2\Big(r-a\arctan\frac{r}{a}\Big)\end{aligned}`},
      raw`So its field heads for $1/r$, not $1/r^2$, for good.`,
    ]},
    {heading: 'A density that blows up', body: [
      raw`A density can be infinite at a point and the charge still finite, because the shells near the centre are small. For $\rho=\beta/r$ inside a ball of radius $R$, take $0<r\le R$. The shell’s volume $4\pi r'^2dr'$ swallows the $1/r'$:`,
      {tex: raw`Q_{\text{enc}}=\int_0^r\frac{\beta}{r'}\,4\pi r'^2\,dr'=2\pi\beta r^2\;\Rightarrow\;E_r=\frac{2\pi\beta r^2}{4\pi\varepsilon_0r^2}=\frac{\beta}{2\varepsilon_0}`},
      raw`No $r$ is left: away from the centre, the field’s size is the same at every radius. Its radial direction turns from place to place, so as a vector it is not uniform. At the singular centre there is no direction-independent limit: $\hat{\mathbf r}$ depends on how you approach it. The total charge remains finite.`,
    ]},
    {heading: 'Running it backwards', body: [
      raw`Gauss’s law runs in both directions. Given the field of a round charge, the left side is known, and the law gives the charge inside every sphere: $Q_{\text{enc}}(r)=4\pi\varepsilon_0r^2E_r(r)$. The charge in a thin shell between $r$ and $r+dr$ is $\rho\,4\pi r^2\,dr$, so the density is how fast $Q_{\text{enc}}$ changes with $r$, over the shell’s area $4\pi r^2$:`,
      {tex: raw`\rho(r)=\frac{1}{4\pi r^2}\frac{dQ_{\text{enc}}}{dr}=\frac{\varepsilon_0}{r^2}\frac{d}{dr}\big(r^2E_r\big)`},
      raw`Differentiate, do not divide: $Q_{\text{enc}}$ over the ball’s volume is the average density inside $r$, not the density at $r$.`,
    ]},
    {heading: 'A flux integral you have to do', body: [
      raw`Sometimes the question is the flux itself, through a surface that is not closed. Take a charge $q$ on the axis of a square of side $2b$, the line through its centre at right angles to it, a distance $d$ from the square, and count the flux out through the square with its normal pointing away from $q$. The field’s component along that normal at $(x,y)$ is $kqd/(d^2+x^2+y^2)^{3/2}$, different at every point, so integrate, over $y$ and then over $x$. With $x$ held fixed, the $y$ integral is the standard $\int dy/(c^2+y^2)^{3/2}=y/\big(c^2\sqrt{c^2+y^2}\big)$, with $c^2=d^2+x^2$; the $x$ integral that is left has the antiderivative $\frac{1}{bd}\arctan\big(bx/(d\sqrt{x^2+d^2+b^2})\big)$, which you can check by differentiating:`,
      {tex: raw`\begin{aligned}\Phi&=\int_{-b}^{b}\!\!\int_{-b}^{b}\frac{kqd\,dy\,dx}{(d^2+x^2+y^2)^{3/2}}\\&=\int_{-b}^{b}\frac{2kqbd\,dx}{(d^2+x^2)\sqrt{d^2+x^2+b^2}}\\&=\frac{q}{\pi\varepsilon_0}\arctan\frac{b^2}{d\sqrt{d^2+2b^2}}\end{aligned}`},
      raw`Two checks. As $b\to\infty$ the square becomes a plane and the flux $q/(2\varepsilon_0)$: half the charge’s flux, the half heading that way. With $d=b$ the square is one face of a cube with $q$ at its centre, and the arctangent is $\pi/6$: the flux is $q/(6\varepsilon_0)$, the sixth that symmetry gave in When symmetry runs out.`,
      raw`Sometimes the law spares you the integral. For the flux of a uniform field $E$ along the axis of a hemisphere of radius $R$, through its curved surface, close the bowl with its flat disk. The closed surface holds no charge, so its net flux is zero, and the curved part carries the disk’s flux with the sign turned round: $\pi R^2E$ in size.`,
    ]},
    {heading: 'A slab whose charge changes sign', body: [
      raw`The pillbox in Sheets and slabs stood across the middle and trusted the field below the middle to mirror the field above it: away from the middle on both sides, or toward it on both. Let the density be $\rho_0z/a$ between $z=-a$ and $z=a$: one sign above the middle, the other below. Flipping the slab over its middle now turns $\rho$ into $-\rho$, so the field below is the field above, pointing the same way, and the symmetric pillbox reports $E_zA-E_zA=0$: correct, and empty. Two other facts settle it. Cut the slab into thin layers; their charges add to zero, so outside all of them their fields cancel: no field outside. Then a pillbox with its bottom face below the slab and its top face at $z$ has flux only through the top.`,
    ]},
    {heading: 'Going further: two side roads', body: [
      raw`The halo’s charge is infinite, yet its field is settled: it thins out far away, so the fields of its distant pieces add to a finite sum, however they are grouped. Fill all of space evenly and they do not: grouped in spheres about one point, the pieces give $\rho r/(3\varepsilon_0)$ measured from that point, but any point could be that centre, and the fields measured from two centres differ. An even fill of all space has no one field its pieces agree on.`,
      raw`If you have met the divergence, a measure of how much a field spreads out from each point, the backwards formula is $\varepsilon_0$ times the divergence of a radial field $E_r(r)\,\hat{\mathbf r}$: Gauss’s law said at a point. Nothing else in this section needs it.`,
    ]},
  ],
  read: [
    {book: 'OpenStax, University Physics Volume 2', where: '§6.3, Applying Gauss’s Law: charge distributions that vary with r', url: 'https://openstax.org/books/university-physics-volume-2/pages/6-3-applying-gausss-law'},
    {book: 'Griffiths, Introduction to Electrodynamics', where: '§2.2.1 to §2.2.3: the divergence of E, ρ = ε₀∇·E, and Gauss’s law applied'},
    {book: 'Purcell and Morin, Electricity and Magnetism', where: 'Chapter 2, The electric potential: the divergence of a field, and finding the charge from it'},
    {book: 'Knight, Physics for Scientists and Engineers', where: 'Chapter 27, Gauss’s law: the end-of-chapter problems'},
  ],
  cases: [
    {
      key: 'halo', label: 'A halo with no edge',
      figure: {charge: {kind: 'halo', size: .6, symbol: raw`\rho`, name: 'a halo of charge with no edge, its density’s magnitude falling as one over r squared far out'},
        surface: {kind: 'sphere', size: {min: .3, max: 2.4, initial: 1.2}, other: 0, label: 'Radius r'}, reference: REFERENCE},
      setup: raw`Charge fills all of space with density $\rho=\rho_0a^2/(r^2+a^2)$, where $r$ is the distance from a centre. Find the field everywhere, and say how its magnitude falls far away.`,
      symmetry: {
        tex: raw`\vec E=E_r(r)\,\hat{\mathbf r}`,
        say: raw`The density depends only on $r$, so the field is radial. However large the sphere, there is charge beyond it.`,
        line: raw`$\rho$ depends only on $r$: radial. And there is charge beyond every sphere.`,
        caption: 'The density depends only on the distance from the centre, so every turn about it leaves the charge as it was, and the field is radial. The charge has no edge: however large a sphere, there is charge beyond it.',
      },
      surface: {
        tex: raw`A=4\pi r^2`,
        say: raw`A sphere of radius $r$ about the centre, through $P$.`,
        line: raw`A sphere through $P$, about the centre.`,
        caption: 'Draw a sphere of radius r through P, about the centre.',
      },
      left: {
        tex: raw`\Phi=E_r\,(4\pi r^2)`,
        say: raw`The easy half, written first.`,
        line: raw`The left side first: $E_r(4\pi r^2)$.`,
        caption: 'The left side, written first because it is the easy half: E_r times four π r squared.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=\int_0^r\frac{4\pi\rho_0a^2r'^2}{r'^2+a^2}\,dr'`,
        say: raw`Write $r'^2/(r'^2+a^2)$ as $1-a^2/(r'^2+a^2)$; the second part integrates to an arctangent, and $Q_{\text{enc}}$ is $4\pi\rho_0a^2$ times $r-a\arctan(r/a)$.`,
        line: raw`Shells out to $r$: its size keeps growing, about in step with $r$ far out.`,
        caption: 'The right side, by thin shells out to r. Writing r prime squared over r prime squared plus a squared as one minus a squared over r prime squared plus a squared, the integral is four π ρ₀ a squared times r minus a arctan r over a. Its size never stops growing: far out it grows in step with r.',
      },
      solve: {
        tex: raw`E_r=\frac{\rho_0a^2}{\varepsilon_0r^2}\Big(r-a\arctan\frac{r}{a}\Big)`,
        answer: raw`E_r=\frac{\rho_0a^2}{\varepsilon_0r^2}\Big(r-a\arctan\frac{r}{a}\Big)`,
        say: raw`Far out, $E_r\to\rho_0a^2/(\varepsilon_0r)$: it heads for $1/r$, never $1/r^2$.`,
        line: raw`Far out, $|E_r|$ falls as $1/r$: $|Q_{\text{enc}}|$ keeps growing.`,
        caption: 'Divide by four π ε₀ r squared. Near the centre its magnitude grows in step with r, like a uniform ball’s; far out its magnitude falls only as one over r, since the enclosed charge is approximately proportional to r. Out for a positive ρ₀, in for a negative one.',
      },
      checks: [
        {title: 'Near the centre', text: raw`For $r\ll a$ the arctangent is nearly $r/a-r^3/(3a^3)$, so $Q_{\text{enc}}\approx\frac43\pi\rho_0r^3$ and $E_r\approx\rho_0r/(3\varepsilon_0)$, a uniform ball’s field: so close to the centre the density has hardly changed from its central value.`},
        {title: 'No finite total', text: raw`$Q_{\text{enc}}$ has no finite limit as $r$ grows, so the halo’s total charge is not finite, and there is no point-charge field far away. Drag the radius out: the profile’s size peaks and then falls ever more slowly, heading for $1/r$.`},
        {title: 'A faster fall', text: raw`If the density is finite near the centre and decreases in magnitude far out as an inverse power $1/r^p$ with $p>3$, the total charge is finite: the shell integral behaves as $\int r'^{2-p}\,dr'$. Far out the field approaches $kQ/r^2$ for that total charge.`},
      ],
    },
    {
      key: 'cusp', label: 'Density that blows up at the centre',
      figure: {charge: {kind: 'cusp', size: 1.1, symbol: raw`\rho`, name: 'a ball whose density blows up at its centre, as one over r', bounds: ['R'], amount: .5},
        surface: {kind: 'sphere', size: {min: .75, max: 2.2, initial: .9}, other: 0, label: 'Radius r',
          regions: [
            {name: 'inside the ball', tex: raw`E_r=\frac{\beta}{2\varepsilon_0}`, say: raw`For $r>0$ inside, the sphere holds $2\pi\beta r^2$, and the $r^2$ cancels: the same size away from the centre.`},
            {name: 'outside the ball', tex: raw`E_r=\frac{\beta R^2}{2\varepsilon_0r^2}`, say: raw`Outside, all of the ball’s $2\pi\beta R^2$: a point charge’s field.`},
          ]}, reference: REFERENCE},
      setup: raw`Inside a ball of radius $R$ the charge density is $\beta/r$: its magnitude grows without bound toward the centre. How much charge does the ball hold, and what field does it make, inside and out?`,
      symmetry: {
        tex: raw`\vec E=E_r(r)\,\hat{\mathbf r}`,
        say: raw`Still round: radial, its size set by $r$. An infinite density at one point does not change that.`,
        line: raw`Round, so radial: an infinite density at one point does not spoil that.`,
        caption: 'The density depends only on r, so the field is radial. That the density is infinite at the centre does not spoil the symmetry.',
      },
      surface: {
        tex: raw`A=4\pi r^2`,
        say: raw`A sphere through $P$, inside the ball or round it.`,
        line: raw`A sphere through $P$, inside the ball or round it.`,
        caption: 'Draw a sphere of radius r through P, inside the ball or round it.',
      },
      left: {
        tex: raw`\Phi=E_r\,(4\pi r^2)`,
        say: raw`As for every sphere.`,
        line: raw`The left side, $E_r(4\pi r^2)$.`,
        caption: 'The left side, E_r times four π r squared.',
      },
      right: {
        tex: raw`\begin{aligned}Q_{\text{enc}}&=\int_0^r\frac{\beta}{r'}\,4\pi r'^2\,dr'\\&=2\pi\beta r^2\quad(r\le R)\end{aligned}`,
        say: raw`The shell’s $r'^2$ swallows the $1/r'$: the charge near the centre is small, though the density there is not.`,
        line: raw`The shell’s $r'^2$ beats the $1/r'$: finite charge, $2\pi\beta r^2$.`,
        caption: 'The right side, by thin shells. Each shell’s volume, four π r prime squared d r prime, swallows the one over r prime: the charge inside r is two π β r squared, finite, though the density at the centre is not. Outside the ball, two π β R squared.',
      },
      solve: {
        tex: raw`E_r=\frac{2\pi\beta r^2}{4\pi\varepsilon_0r^2}=\frac{\beta}{2\varepsilon_0}\quad(0<r\le R)`,
        answer: raw`E_r=\begin{cases}\dfrac{\beta}{2\varepsilon_0}, & 0<r\le R\\[6pt]\dfrac{\beta R^2}{2\varepsilon_0r^2}, & r\ge R\end{cases}`,
        say: raw`No $r$ left for $r>0$ inside: the same size, though still pointing along $\hat{\mathbf r}$. The singular centre has no direction-independent limit.`,
        line: raw`For $r>0$ inside, $r^2$ cancels: the same size away from the centre.`,
        caption: 'Divide by four π ε₀ r squared and the r squared cancels: inside, away from the centre, the field has the same size at every radius, out for a positive β and in for a negative one. It still points along the radius, so it is not uniform as a vector. Outside, a point charge’s field.',
      },
      checks: [
        {title: 'Continuous at R', text: raw`Both answers give $\beta/(2\varepsilon_0)$ at $r=R$: there is no surface charge to make a jump.`},
        {title: 'The same size, not the same field', text: raw`Drag a nonzero radius inside the ball: the profile is flat, but the arrows turn with $\hat{\mathbf r}$. At the singular centre the radial direction is undefined and the field has no direction-independent limit.`},
        {title: 'Finite charge', text: raw`The whole ball holds $2\pi\beta R^2$: a finite charge from an infinite density.`},
      ],
    },
    {
      key: 'backwards', label: 'Given the field, find the charge',
      figure: {charge: {kind: 'rising', size: 1.1, symbol: raw`\rho`, name: 'a ball whose field is given, its charge to be found', bounds: ['R'], amount: 3, insideNames: ['= 4πε₀E_R r⁴/R²', '= 4πε₀E_R R²']},
        surface: {kind: 'sphere', size: {min: .3, max: 2.2, initial: .75}, other: 0, label: 'Radius r',
          regions: [
            {name: 'inside the ball', tex: raw`E_r=E_R\,\frac{r^2}{R^2}`, say: raw`The field given inside: its magnitude grows as $r^2$.`},
            {name: 'outside the ball', tex: raw`E_r=E_R\,\frac{R^2}{r^2}`, say: raw`Outside there is no charge, so the field is a point charge’s: all of the ball’s charge, with $E_R$ at the surface.`},
          ]}, reference: REFERENCE},
      setup: raw`Inside a round ball of radius $R$ the field is $E_r=E_R\,r^2/R^2$, with $E_R$ its value at the surface. There is no surface charge at $R$ and no charge outside the ball. What density $\rho(r)$ makes it?`,
      symmetry: {
        tex: raw`\vec E=E_R\,\frac{r^2}{R^2}\,\hat{\mathbf r}\quad(r\le R)`,
        say: raw`The field is given, radial, its size set by $r$: so the charge is round about the centre.`,
        line: raw`The field is given, radial: the charge must be round about the centre.`,
        caption: 'This time the field is given, radial, with a size that depends only on r. So the charge that makes it is round about the centre, and its density depends only on r.',
      },
      surface: {
        tex: raw`A=4\pi r^2`,
        say: raw`A sphere of radius $r$ through $P$, inside the ball or outside it. Outside, the field follows by continuity at $R$ and the constant total charge.`,
        line: raw`A sphere through $P$: inside the ball or outside it.`,
        caption: 'Draw a sphere of radius r through P, inside the ball or outside it. There is no charge beyond the ball and no surface charge at its edge.',
      },
      left: {
        tex: raw`\Phi=4\pi E_R\begin{cases}\dfrac{r^4}{R^2}, & r\le R\\[6pt]R^2, & r\ge R\end{cases}`,
        say: raw`Inside, multiply the given $E_Rr^2/R^2$ by $4\pi r^2$. Outside, $E_r=E_RR^2/r^2$, so the flux stays constant.`,
        line: raw`The given field fixes the flux inside; outside, the flux stays constant.`,
        caption: 'The left side, known this time: inside, the given field times four π r squared. Outside, the field’s magnitude falls as the inverse square and the flux stays at its surface value.',
      },
      right: {
        tex: raw`Q_{\text{enc}}=4\pi\varepsilon_0E_R\begin{cases}\dfrac{r^4}{R^2}, & r\le R\\[6pt]R^2, & r\ge R\end{cases}`,
        say: raw`Gauss’s law run backwards gives the charge inside every sphere. Once the sphere is outside the ball, it encloses the same total charge.`,
        line: raw`Run backwards, the law gives the charge inside every sphere.`,
        caption: 'The right side is the unknown now. Gauss’s law gives it: ε₀ times the flux. Inside, four π ε₀ E_R r to the fourth over R squared; outside, the constant total, four π ε₀ E_R R squared.',
      },
      solve: {
        tex: raw`\begin{aligned}\rho&=\frac{1}{4\pi r^2}\frac{dQ_{\text{enc}}}{dr}\\&=\begin{cases}\dfrac{4\varepsilon_0E_R\,r}{R^2}, & r<R\\[6pt]0, & r>R\end{cases}\end{aligned}`,
        answer: raw`\rho(r)=\begin{cases}\dfrac{4\varepsilon_0E_R\,r}{R^2}, & r<R\\[6pt]0, & r>R\end{cases}`,
        label: 'The answer, the density at r',
        note: raw`Differentiate, do not divide: $Q_{\text{enc}}$ over the volume is the average density inside $r$. It has the sign of $E_R$.`,
        say: raw`The charge in a thin shell is $\rho\,4\pi r^2\,dr$, so $\rho$ is how fast $Q_{\text{enc}}$ changes, per unit of shell.`,
        line: raw`Differentiate $Q_{\text{enc}}$: a density proportional to $r$ inside, zero outside.`,
        caption: 'The charge in a thin shell is ρ times four π r squared d r, so ρ is the rate Q_enc changes, over four π r squared: four ε₀ E_R r over R squared. Its size grows in step with r from zero at the centre. A field pointing in, a negative E_R, means a negative density. Outside, the enclosed charge is constant, so its derivative and the density are zero.',
      },
      checks: [
        {title: 'The divergence agrees', text: raw`The same density from $\rho=\varepsilon_0\frac{1}{r^2}\frac{d}{dr}(r^2E_r)$:`, tex: raw`\frac{\varepsilon_0}{r^2}\frac{d}{dr}\Big(\frac{E_Rr^4}{R^2}\Big)=\frac{4\varepsilon_0E_Rr}{R^2}`},
        {title: 'Other powers', text: raw`For $E_r=E_R(r/R)^n$ with $n>-2$, the enclosed charge tends to zero at the centre and the density for $r>0$ is proportional to $r^{n-1}$. At $n=-2$ the formula below is zero away from the centre, but a point charge remains at the centre: $Q_{\text{enc}}=4\pi\varepsilon_0E_RR^2$. Powers below that would require an unbounded enclosed charge near the centre:`, tex: raw`\rho=\frac{\varepsilon_0}{r^2}\frac{d}{dr}\Big(\frac{E_Rr^{n+2}}{R^n}\Big)=\frac{(n+2)\,\varepsilon_0E_R\,r^{n-1}}{R^n}`},
        {title: 'The total', text: raw`At $r=R$, $Q_{\text{enc}}=4\pi\varepsilon_0E_RR^2$, so $E_R=Q/(4\pi\varepsilon_0R^2)$: the field at the surface is the whole charge’s, as it must be.`},
        {title: 'Not the average', text: raw`Dividing $Q_{\text{enc}}$ by $\frac43\pi r^3$ gives $3\varepsilon_0E_Rr/R^2$, three quarters of the true density at $r$: the average inside, not the value at the edge.`},
      ],
    },
    {
      key: 'odd', label: 'A slab whose charge changes sign',
      figure: {charge: {kind: 'oddslab', size: .6, symbol: raw`\rho`, name: 'a slab whose density changes sign at its middle', bounds: ['−a', 'a'], amount: .375},
        surface: {kind: 'pillbox', size: {min: -.85, max: 1.2, initial: .2}, other: .8, label: 'Height z', low: -1,
          regions: [
            {name: 'below the slab', tex: raw`E_z=0`, say: raw`Below the slab the sheets’ fields cancel: their charges add to zero. That comes from adding them, and is what the one-sided pillbox stands on.`, superposition: true},
            {name: 'inside the slab', tex: raw`E_z=\frac{\rho_0}{2\varepsilon_0a}(z^2-a^2)`, say: raw`Inside, the pillbox holds the slab from $-a$ to $z$: the field is strongest at the middle.`},
            {name: 'above the slab', tex: raw`E_z=0`, say: raw`Above, the pillbox holds the whole slab, whose charge adds to zero, and no field crosses its bottom face: no field at its top either.`},
          ]}, reference: REFERENCE},
      setup: raw`A thick infinite slab of half-thickness $a$ carries a density proportional to the signed height above its middle, $\rho=\rho_0z/a$, so its two halves carry opposite charges. What field does it make, inside it and out?`,
      symmetry: {
        tex: raw`E_z(-z)=E_z(z)`,
        say: raw`Flipping the slab over its middle turns $\rho$ into $-\rho$, so the field below is the field above, pointing the same way.`,
        line: raw`Flip it over and $\rho$ changes sign: the field points the same way on both sides.`,
        caption: 'Turns about a line perpendicular to the slab leave it as it was, so the field is perpendicular to it. But flipping it over its middle turns ρ into −ρ, which reverses the field: so the field below the middle is the field above it, pointing the same way, not away from the middle on both sides.',
      },
      surface: {
        tex: raw`\begin{aligned}&\text{bottom face: below the slab}\\&\text{top face: at height }z\end{aligned}`,
        say: raw`Across the middle, a pillbox gives $E_zA-E_zA=0$: true, and no help. Put its bottom face below the slab, where the sheets’ fields cancel.`,
        line: raw`A pillbox from below the slab, where $E=0$, up to $z$.`,
        caption: 'A pillbox standing across the middle gives E_z A minus E_z A equals zero: true, and no help. So stand the pillbox’s bottom face below the slab, where there is no field, since the slab’s thin sheets add to zero charge, and its top face at height z.',
      },
      left: {
        tex: raw`\Phi=E_z(z)\,A+0+0`,
        say: raw`The bottom face sees no field; the side has $\vec E$ along it. Only the top face carries flux.`,
        line: raw`Only the top face carries flux: $E_zA$.`,
        caption: 'The left side. The bottom face sees no field, and the side has the field along it. Only the top face carries flux: E_z A, with E_z the field’s signed part along its upward normal.',
      },
      right: {
        tex: raw`\begin{aligned}Q_{\text{enc}}&=\int_{-a}^{z}\frac{\rho_0z'}{a}A\,dz'\quad(|z|\le a)\\&=\begin{cases}\dfrac{\rho_0A}{2a}(z^2-a^2), & |z|\le a\\[6pt]0, & |z|\ge a\end{cases}\end{aligned}`,
        say: raw`Inside, integrate from the slab’s lower face to $z$: the result has the sign opposite to $\rho_0$. Below the slab the box holds no charge; above it, the two halves cancel.`,
        line: raw`Inside, add slices from $-a$ to $z$; outside, the enclosed charge is zero.`,
        caption: 'The right side. The pillbox holds the slab from its lower face up to z: ρ₀ A over two a times z squared minus a squared, of the sign opposite to ρ₀ inside the slab, and zero once the box holds the whole slab.',
      },
      solve: {
        tex: raw`\begin{aligned}E_z&=\frac{Q_{\text{enc}}}{A\varepsilon_0}\\&=\begin{cases}\dfrac{\rho_0}{2\varepsilon_0a}(z^2-a^2), & |z|\le a\\[6pt]0, & |z|\ge a\end{cases}\end{aligned}`,
        answer: raw`E_z=\begin{cases}\dfrac{\rho_0}{2\varepsilon_0a}(z^2-a^2), & |z|\le a\\[6pt]0, & |z|\ge a\end{cases}`,
        say: raw`Strongest at the middle, pointing from the positive half toward the negative half; nothing outside.`,
        line: raw`Strongest at the middle, from the positive half to the negative; nothing outside.`,
        caption: 'Divide by A. Inside, the field points from the positive half toward the negative half, strongest at the middle and tending to zero at both faces. Outside, none.',
        note: raw`With $\rho_0$ positive, $E_z$ is negative inside: downward, out of the upper half’s charge and into the lower half’s. With $\rho_0$ negative, upward.`,
      },
      checks: [
        {title: 'Zero at both faces', text: raw`At $z=\pm a$, $z^2-a^2=0$: the inside answer meets the outside’s zero, as a volume charge with no surface charge must.`},
        {title: 'Two halves, two plates', text: raw`Like a capacitor’s plates, the two halves carry equal and opposite charges, so outside both their fields cancel. Inside, the field runs from the positive half to the negative one, and it is strongest at the middle, where all of one half lies above and all of the other below.`},
        {title: 'Why not the middle', text: raw`The pillbox across the middle relies on the field below being the mirror of the field above. A flip that turns the charge into its opposite makes the field below the same as above instead, and that pillbox then measures nothing.`},
      ],
    },
  ],
  traps: [
    {wrong: raw`Far enough away, every charge’s field falls as $1/r^2$.`, right: raw`Only a charge whose total is finite and not zero. The halo’s enclosed charge grows without bound in magnitude, and its field’s magnitude heads for $1/r$.`},
    {wrong: 'A density that is infinite somewhere means an infinite charge.', right: raw`Not if it blows up slowly enough: $\rho=\beta/r$ is infinite at the centre, yet a ball of it holds $2\pi\beta R^2$, because the shells there are small.`},
    {wrong: raw`The density is $Q_{\text{enc}}$ divided by the volume inside $r$.`, right: raw`That is the average inside $r$. The density at $r$ is $\frac{1}{4\pi r^2}\,dQ_{\text{enc}}/dr$: differentiate, do not divide.`},
    {wrong: 'A pillbox standing across a slab’s middle always finds its field.', right: raw`Only when the field below the middle mirrors the field above it. For $\rho=\rho_0z/a$ it points the same way on both sides, the symmetric pillbox gives zero equals zero, and a pillbox from below the slab is needed.`},
    {wrong: raw`The flux through a flat surface is $EA$.`, right: raw`Only for a field the same all over it and perpendicular to it. Otherwise integrate $E_\perp$ over the surface, piece by piece.`},
  ],
  instrument: 'profile',
  onward: 'home',
};
