import type {Params} from '../problems/types';

export type LessonArtifact = {
  title: string;
  subtitle: string;
  setup: string;
  integralTex: string;
  resultTex: string;
  params: Pick<Params, 'distance' | 'size' | 'charge' | 'phi'>;
  answers?: Record<string, string>;
  svg?: string;
};

export function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** A self-contained HTML copy a student can save offline and print later. No network, no app chrome. */
export function artifactHtml(a: LessonArtifact) {
  const answers = a.answers && Object.keys(a.answers).length
    ? `<h2>Your answers</h2><dl>${Object.entries(a.answers).map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd><code>${escapeHtml(v)}</code></dd>`).join('')}</dl>`
    : '';
  const figure = a.svg ? `<figure>${a.svg}</figure>` : '';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>${escapeHtml(a.title)} · Field Builder</title>
<style>
@page { size: letter; margin: 12mm; }
html,body { background:#fff; color:#0e2333; font: 15px/1.55 system-ui, sans-serif; margin:0; }
main { max-width: 720px; margin: 0 auto; padding: 18px; }
h1 { font: 400 28px/1.15 Georgia, serif; margin: 0 0 8px; }
h2 { font: 400 20px/1.2 Georgia, serif; margin: 28px 0 10px; }
p, li { max-width: 62ch; }
code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
dl { display: grid; grid-template-columns: 8rem 1fr; gap: 6px 14px; }
dt { color: #4a6274; }
figure { margin: 18px 0; }
svg { width: 100%; height: auto; max-height: 420px; }
footer { margin-top: 32px; color: #4a6274; font-size: 12px; }
</style></head>
<body><main>
<p>Field Builder · saved copy</p>
<h1>${escapeHtml(a.title)}</h1>
<p>${escapeHtml(a.subtitle)}</p>
${figure}
<h2>Setup</h2>
<p>${escapeHtml(a.setup)}</p>
<h2>Parameters</h2>
<ul>
<li>Distance r / z / a = ${escapeHtml(String(a.params.distance))} m</li>
<li>Size L / 2R = ${escapeHtml(String(a.params.size))} m</li>
<li>Charge Q / λ / σ = ${escapeHtml(String(a.params.charge))}</li>
<li>Arc φ = ${escapeHtml(String(a.params.phi))} rad</li>
</ul>
<h2>Integral</h2>
<pre>${escapeHtml(a.integralTex)}</pre>
<h2>Closed form</h2>
<pre>${escapeHtml(a.resultTex)}</pre>
${answers}
<footer>Printed or saved from Field Builder. Equations are TeX source so they remain readable without a network.</footer>
</main></body></html>`;
}

export function downloadArtifact(filename: string, html: string) {
  const blob = new Blob([html], {type: 'text/html;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function printLesson() {
  window.print();
}
