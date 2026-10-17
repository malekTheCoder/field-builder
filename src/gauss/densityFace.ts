import {density} from './instruments';

export type GradedBall = 'rising' | 'falling';
export const isGradedBall = (kind: string): kind is GradedBall => kind === 'rising' || kind === 'falling';

/** A radial cut face of a graded ball, with local density magnitude at every vertex. Normalise by the profile's
 * own peak, not the charge in a shell: shell area belongs in Q_enc and must not make a low-density outer layer
 * look dense. These are the same profiles as Shell by shell. Their sign and total charge do not change the
 * relative shading. Actual radial positions, rather than overlapping translucent spheres, prevent projected
 * optical depth from making the centre look densest when rho is proportional to r. */
export function densityFace(kind: GradedBall, radius: number, azimuth: number, radialSteps = 16, angularSteps = 32) {
  const positions: number[] = [], indices: number[] = [], weights: number[] = [];
  const peak = density(kind, kind === 'rising' ? 1 : 0);
  for (let j = 0; j <= radialSteps; j++) {
    const fraction = j / radialSteps, r = radius * fraction;
    for (let i = 0; i <= angularSteps; i++) {
      const theta = Math.PI * i / angularSteps;
      positions.push(r * Math.sin(theta) * Math.cos(azimuth), r * Math.sin(theta) * Math.sin(azimuth), r * Math.cos(theta));
      weights.push(Math.abs(density(kind, fraction)) / peak);
    }
  }
  for (let j = 0; j < radialSteps; j++) for (let i = 0; i < angularSteps; i++) {
    const a = j * (angularSteps + 1) + i, b = a + angularSteps + 1;
    indices.push(a, b, b + 1, a, b + 1, a + 1);
  }
  return {positions, indices, weights};
}
