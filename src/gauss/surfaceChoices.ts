import type {Sym} from './instruments';

export type SurfaceChoice = {id: string; label: string; description: string; reason: string; tex?: string};
/* CHOOSE A SURFACE AFTER PROVING THE SYMMETRY. These are choices about extracting a field from flux, not
 * about whether Gauss's law holds. Every candidate is a closed surface. In particular, a sphere centred on
 * an infinite line has constant E·n for the actual inverse-distance field, although neither constant |E|
 * nor normal E follows from its geometry. Its feedback must not claim that its normal component varies.
 * Above a sheet, zero enclosed charge gives zero flux even though the field is nonzero everywhere. */
export const SURFACE_CHOICES: Record<Sym, SurfaceChoice[]> = {
  sphere: [
    {id: 'concentric', label: 'Concentric sphere', description: 'Centred on the charged ball, passing through P.',
      reason: 'The field is normal to every patch, and symmetry makes its signed radial component $E_r$ the same everywhere. Every patch contributes. Here $r$ is the sphere’s radius.', tex: String.raw`\Phi=E_r(4\pi r^2)`},
    {id: 'displaced-sphere', label: 'Displaced sphere', description: 'A different centre from the charged ball, passing through P.',
      reason: 'Distance from the charge’s centre and alignment with the surface normal vary. You cannot replace the integral by the field at P times this sphere’s area.'},
    {id: 'cube', label: 'Centred cube', description: 'Centred on the charged ball, with P on a face.',
      reason: 'Distance from the charge’s centre varies across each flat face, as does the field’s projection onto its normal. The field at P cannot stand in for the whole face.'},
  ],
  line: [
    {id: 'coaxial', label: 'Coaxial cylinder', description: 'Its axis follows the charged line, with P on its curved wall.',
      reason: 'The signed radial component $E_r$ is constant and normal on the wall. The field is tangent to both end caps, so they contribute no flux even though the field is nonzero there. Here $r$ is the cylinder’s radius and $L$ its chosen length.', tex: String.raw`\Phi=E_r(2\pi rL)+0+0`},
    {id: 'line-sphere', label: 'Sphere on the line', description: 'Centred on a point of the line, with P at its equator.',
      reason: 'Different latitudes lie at different distances from the line. The field is neither constant in magnitude nor everywhere normal to this sphere. Symmetry alone does not give a single radial field component to take outside the flux integral.'},
    {id: 'displaced-cylinder', label: 'Displaced cylinder', description: 'Its axis is offset but parallel, still surrounding the line, with P on the wall.',
      reason: 'Distance from the charged line and alignment with the wall’s normal vary around the wall. The end caps still have no flux, but the wall does not have one constant normal radial field.'},
  ],
  plane: [
    {id: 'pillbox', label: 'Pillbox across the sheet', description: 'Equal flat faces parallel to the sheet, equally far above and below, with P on a face.',
      reason: 'Both faces have the same signed outward component $E_\\perp$ and area $A$. Their fluxes add. The field is tangent to the side wall, which contributes no flux.', tex: String.raw`\begin{aligned}\Phi&=E_\perp A+E_\perp A+0\\&=2E_\perp A\end{aligned}`},
    {id: 'pillbox-above', label: 'Pillbox above the sheet', description: 'Both flat faces parallel to the sheet and above it, with P on a face.',
      reason: 'No charge is enclosed, so the net flux is zero. The equal face areas then require equal field components at the two heights, but do not determine their value. Zero flux does not mean zero field.'},
    {id: 'sphere-above', label: 'Sphere above the sheet', description: 'Wholly above the sheet, passing through P.',
      reason: 'No charge is enclosed. The uniform field’s inward and outward flux cancel. Zero net flux does not mean zero field, and this equation cannot determine the field at P.'},
  ],
};
