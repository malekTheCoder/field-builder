'use client';
/* The view modes and the toggles are named groups of buttons, as the integral lessons' toolbar sets them. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label -- and the list's links are rendered by SidebarMenuButton, which gives each its glyph and name. */
import {useCallback, useEffect, useInsertionEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties} from 'react';
import {flushSync} from 'react-dom';
import {useReducedMotion} from 'motion/react';
import {ArrowRight, ChevronLeft, CircleHelp, ClipboardCheck, GraduationCap, Link as LinkIcon, Moon, MoreHorizontal, PanelLeft, Play, Printer, Sun} from 'lucide-react';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Sidebar, SidebarContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider} from '@/components/ui/sidebar';
import {Dialog, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import {PROBLEMS} from '../problems/definitions';
import {isReady} from '../problems/readiness';
import {MathText, Prose} from '../components/Math';
import {Hint} from '../components/Hint';
import {BuildPlayer, runClock} from '../explorer/BuildPlayer';
import {LessonIntro} from '../explorer/LessonIntro';
import {Brand} from '../explorer/Brand';
import {STORAGE} from '../explorer/Explorer';
import {GAUSS, PlannedGlyph, ShapeGlyph, families} from '../explorer/lessons';
import {GUIDE_HREF, QUIZ_HREF, inPlace, navigate, subscribeAddress} from '../state/route';
import {gaussHref, gaussIdOf, gaussLesson, isGaussReady, type GaussId} from './index';
import {gaussStages, moment, runSeconds, stageStart} from './run';
import {GaussFigure, type FigureView} from './GaussFigure';
import {GaussBoard} from './GaussBoard';
import {GaussRange} from './GaussRange';
import {SymmetryTest} from './SymmetryTest';
import {FluxInstrument} from './FluxInstrument';
import {FieldProfile} from './FieldProfile';
import {CavityInstrument} from './CavityInstrument';
import {regionOf} from './instruments';
import {GaussListFamily, GaussLibraryFamily} from './GaussFamily';
import type {Sym} from './instruments';
import '../explorer/explorer.css';
import '../print.css';
import './gauss.css';
/* A GAUSS LESSON'S PAGE. The same chrome as an integral lesson (Explorer): the header, the lesson list, the title,
 * the lesson's lead with "Read the lesson", the figure card with Watch it build and its transport, the board
 * beside it, the endnotes and the Next card. Built from the Explorer's own parts where they are generic (the
 * transport, the lesson text, the board's DerivationBoard, the brand, the classes and the sheet) and as a
 * parallel page where the Explorer is the integral lessons' own: its state is a Problem's, which a Gauss lesson
 * is not. docs/gauss-lessons-howto.md says how to add a lesson to it. */
const LESSON_TITLE = 'lesson-title';
/** One beat of the stepped run, for readers who asked for reduced motion: as the integral lessons' run steps. */
const REDUCED_BEAT = 450, MAX_STEP = 100;
const readSearch = () => location.search;
/** The integral lessons, for the list and the library: fixed for the page's life. */
const FIELD_LESSONS = PROBLEMS.filter(p => isReady(p.id));
const lessonHref = (id: string) => `?p=${id}`;
function useSteady<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useInsertionEffect(() => { ref.current = fn; });
  return useCallback((...args: A) => ref.current(...args), []);
}
/** The saved settings the integral lessons keep (Explorer, STORAGE): read for the theme and the list, and
 * written back without touching the rest. */
function readSaved(): Record<string, unknown> {
  try { const v = JSON.parse(localStorage.getItem(STORAGE) ?? '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; }
}
function writeSaved(patch: Record<string, unknown>) {
  try { localStorage.setItem(STORAGE, JSON.stringify({...readSaved(), ...patch})); } catch { /* kept for this visit */ }
}
const RECIPE: {name: string; text: string}[] = [
  {name: 'Symmetry', text: 'Find what the charge’s symmetry forces the field to do: which way it points, and where its size is the same.'},
  {name: 'The surface', text: 'Draw a closed surface through P on which every patch has E square to it and the same, E along it, or E zero.'},
  {name: 'Left side', text: 'The flux integral collapses to E times the area the field crosses.'},
  {name: 'Right side', text: 'Add up only the charge inside the surface, integrating a density if there is one.'},
  {name: 'Solve', text: 'Set the two sides equal and divide. Then check the limits, the boundaries and the sign.'},
];

export default function GaussLesson() {
  const search = useSyncExternalStore(subscribeAddress, readSearch, () => '');
  const id: GaussId = gaussIdOf(search) ?? 'symmetry';
  const lesson = gaussLesson(id)!;
  const reduced = useReducedMotion();
  const [caseKey, setCaseKey] = useState(lesson.cases[0].key);
  const kase = lesson.cases.find(c => c.key === caseKey) ?? lesson.cases[0];
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const size = sizes[`${id}/${kase.key}`] ?? kase.figure.surface.size.initial;
  const [sign, setSign] = useState<1 | -1>(1);
  const [view, setView] = useState<FigureView>('3d');
  const [dark, setDark] = useState(false), [sidebarOpen, setSidebarOpen] = useState(true), [ready, setReady] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false), [library, setLibrary] = useState(false), [recipe, setRecipe] = useState(false);
  const [status, setStatus] = useState(''), [copied, setCopied] = useState('');
  const [printing, setPrinting] = useState(false);
  const watchButton = useRef<HTMLButtonElement>(null), walk = useRef<HTMLDivElement>(null), tourButton = useRef<HTMLButtonElement>(null);
  // The saved theme and list, once, after hydration.
  // oxlint-disable-next-line react/react-compiler -- Reads storage once, after hydration.
  useEffect(() => { const s = readSaved(); setDark(s.dark === true); setSidebarOpen(s.sidebarOpen !== false); setReady(true); }, []);
  useEffect(() => { if (ready) document.documentElement.classList.toggle('dark', dark); }, [dark, ready]);
  useEffect(() => { if (ready) writeSaved({dark, sidebarOpen}); }, [dark, sidebarOpen, ready]);
  useEffect(() => { document.title = `${lesson.title} · Field Builder`; }, [lesson.title]);
  // A NEW LESSON STARTS AT ITS TOP, its text shut, its first case, its run closed, the focus on its title. The
  // first one is the site's to place (Site.tsx), since it may have come from another page.
  const shown = useRef(id);
  useEffect(() => {
    if (shown.current === id) return;
    shown.current = id;
    window.scrollTo({top: 0, behavior: 'auto'});
    document.getElementById(LESSON_TITLE)?.focus({preventScroll: true});
  }, [id]);

  // ---- WATCH IT BUILD: the recipe as a run of five stages, on the integral lessons' transport ----
  const stages = useMemo(() => gaussStages(kase), [kase]);
  const total = runSeconds(stages);
  const [clock] = useState(runClock);
  const [runOpen, setRunOpen] = useState(false), [playing, setPlaying] = useState(false), [index, setIndex] = useState(0), [settled, setSettled] = useState(false);
  const loop = useRef<{stop: () => void} | null>(null), at = useRef({at: 0, stopAt: 0}), said = useRef(-1), quiet = useRef(false), reveal = useRef(false);
  const apply = (t: number) => {
    clock.set(t);
    const m = moment(stages, t);
    setIndex(m.index); setSettled(m.index === stages.length - 1 && m.progress >= .999);
    if (m.index !== said.current) { said.current = m.index; if (!quiet.current) setStatus(`${stages[m.index].name}. ${stages[m.index].line}`); }
  };
  const holdStatus = (ended = false) => { const m = moment(stages, clock.get()); setStatus(ended ? `${stages[m.index].caption} The answer is now at the foot of the board.` : stages[m.index].caption); };
  const stop = () => { loop.current?.stop(); loop.current = null; setPlaying(false); };
  function play(from: number, until: number) {
    loop.current?.stop(); loop.current = null;
    setRunOpen(true); setPlaying(true);
    at.current = {at: from, stopAt: until};
    const done = () => { loop.current = null; setPlaying(false); holdStatus(at.current.at >= total - .01); };
    // REDUCED MOTION STEPS, NEVER SKIPS: the same stages over the same time, in beats with nothing gliding between.
    if (reduced) {
      apply(from);
      const beat = window.setInterval(() => { const c = at.current; c.at = Math.min(c.stopAt, c.at + REDUCED_BEAT / 1000); apply(c.at); if (c.at >= c.stopAt) { window.clearInterval(beat); done(); } }, REDUCED_BEAT);
      loop.current = {stop: () => window.clearInterval(beat)};
      return;
    }
    let last = -1, raf = 0;
    const frame = (now: number) => {
      if (last < 0) last = now;
      const c = at.current;
      c.at = Math.min(c.stopAt, c.at + Math.min(now - last, MAX_STEP) / 1000); last = now;
      apply(c.at);
      if (c.at >= c.stopAt) { done(); return; }
      raf = requestAnimationFrame(frame);
    };
    apply(from);
    raf = requestAnimationFrame(frame);
    loop.current = {stop: () => cancelAnimationFrame(raf)};
  }
  const toggle = useSteady(() => { if (playing) { stop(); holdStatus(); return; } const t = clock.get(); play(t >= total - .01 ? 0 : t, total); });
  const seek = useSteady((t: number, dragging: boolean) => { stop(); setRunOpen(true); quiet.current = dragging; apply(Math.max(0, Math.min(total, t))); quiet.current = false; if (!dragging) holdStatus(); });
  const stepTo = (i: number) => { const s = stageStart(stages, i), e = s + stages[i].seconds; play(s, i === stages.length - 1 ? e : e - .001); };
  const step = useSteady((i: number) => { if (playing) play(stageStart(stages, i), total); else stepTo(i); });
  const boardStep = useSteady((i: number) => stepTo(i));
  const close = useSteady(() => { stop(); setRunOpen(false); clock.set(0); setIndex(0); setSettled(false); said.current = -1; requestAnimationFrame(() => watchButton.current?.focus({preventScroll: true})); });
  const watch = () => { reveal.current = true; play(0, total); };
  // Opened from the button, the focus goes to the play button, the control just pressed in its new place, and the
  // transport is brought into view if it opened below the window.
  useLayoutEffect(() => {
    if (!runOpen || !reveal.current) return;
    reveal.current = false;
    const player = walk.current;
    player?.querySelector<HTMLButtonElement>('.bp-play')?.focus({preventScroll: true});
    const over = (player?.getBoundingClientRect().bottom ?? 0) + 16 - window.innerHeight;
    if (over > 1) window.scrollBy({top: over, behavior: reduced ? 'auto' : 'smooth'});
  }, [runOpen, reduced]);
  // A change of lesson or case closes the run: its lines are another case's.
  useEffect(() => () => loop.current?.stop(), []);
  // oxlint-disable-next-line react/react-compiler -- A new case closes the run, stopping its clock: its lines are another case's.
  useEffect(() => { loop.current?.stop(); loop.current = null; setPlaying(false); setRunOpen(false); clock.set(0); setIndex(0); setSettled(false); said.current = -1; }, [kase, clock]);
  // oxlint-disable-next-line react/react-compiler -- A new lesson opens on its first case, its text shut, its charge positive.
  useEffect(() => { setCaseKey(lesson.cases[0].key); setLessonOpen(false); setSign(1); }, [lesson]);
  // SPACE PAUSES THE RUN, AS IT DOES A VIDEO, with the focus on nothing in particular or on the title.
  useEffect(() => {
    if (!runOpen) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const t = e.target instanceof Element ? e.target : null;
      if (t && t !== document.body && t.id !== LESSON_TITLE) return;
      e.preventDefault(); toggle();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [runOpen, toggle]);
  const figureRun = useMemo(() => runOpen ? {clock, stages} : null, [runOpen, clock, stages]);
  const boardBuild = useMemo(() => ({open: runOpen, index, playing, settled}), [runOpen, index, playing, settled]);
  const mathSteps = useMemo(() => stages.map((_, i) => [[kase.symmetry, kase.surface, kase.left, kase.right, kase.solve][i].tex]), [stages, kase]);

  // ---- paper ----
  useEffect(() => {
    const root = document.documentElement; let wasDark = false;
    const toPaper = () => { wasDark = root.classList.contains('dark'); if (wasDark) root.classList.remove('dark'); flushSync(() => setPrinting(true)); };
    const back = () => { if (wasDark) root.classList.add('dark'); wasDark = false; setPrinting(false); };
    window.addEventListener('beforeprint', toPaper); window.addEventListener('afterprint', back);
    return () => { window.removeEventListener('beforeprint', toPaper); window.removeEventListener('afterprint', back); };
  }, []);
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(''), 3200); return () => clearTimeout(t); }, [copied]);
  async function copyLink() {
    const url = location.origin + location.pathname + gaussHref(id);
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch { ok = false; }
    const words = ok ? 'Link to this lesson copied.' : 'The link to this lesson is in the address bar.';
    setCopied(words); setStatus(words);
  }

  // ---- the parts ----
  const setSize = (n: number) => setSizes(old => ({...old, [`${id}/${kase.key}`]: n}));
  const goField = useSteady((pid: string, e: React.MouseEvent) => { if (!inPlace(e)) return; e.preventDefault(); setLibrary(false); navigate(lessonHref(pid)); });
  const lessonList = useMemo(() => <>{families(FIELD_LESSONS).map(g => <div className="exp-family" key={g.label}><h2 className="exp-family-name">{g.label}</h2><SidebarMenu>{g.items.map(pr => <SidebarMenuItem key={pr.id}>
    <SidebarMenuButton className="exp-shape-button" render={<a href={lessonHref(pr.id)} />} onClick={(e: React.MouseEvent) => goField(pr.id, e)}><span className="shape-icon"><ShapeGlyph id={pr.id} /></span><span>{pr.short}</span></SidebarMenuButton>
  </SidebarMenuItem>)}</SidebarMenu></div>)}<GaussListFamily current={id} /></>, [id, goField]);
  const next = lesson.next && isGaussReady(lesson.next) ? {href: gaussHref(lesson.next), glyph: <PlannedGlyph id={lesson.next} size={22} />, name: gaussLesson(lesson.next)!.title, why: gaussLesson(lesson.next)!.about}
    : lesson.related && isReady(lesson.related.field) ? {href: lessonHref(lesson.related.field), glyph: <ShapeGlyph id={lesson.related.field} size={22} />, name: PROBLEMS.find(p => p.id === lesson.related!.field)?.short ?? '', why: lesson.related.text} : null;
  // An integral lesson to read beside this one: the same field, built the long way.
  const alongside = lesson.alongside && isReady(lesson.alongside.field) ? {href: lessonHref(lesson.alongside.field), glyph: <ShapeGlyph id={lesson.alongside.field} size={22} />, name: PROBLEMS.find(p => p.id === lesson.alongside!.field)?.short ?? '', why: lesson.alongside.text} : null;
  const sym: Sym = kase.key === 'line' ? 'line' : kase.key === 'plane' ? 'plane' : 'sphere';
  const signRow = <div className="exp-range gs-choice"><div><span><span className="exp-name">Sign of the charge</span></span></div>
    <div className="cd-view-modes" role="group" aria-label="Sign of the charge">{([['Positive', 1], ['Negative', -1]] as const).map(([label, value]) => <button key={label} type="button" className={'cd-view-mode' + (sign === value ? ' is-on' : '')} aria-pressed={sign === value} onClick={() => setSign(value)}>{label}</button>)}</div></div>;
  const caseRow = lesson.cases.length > 1 && <div className="exp-range gs-choice"><div><span><span className="exp-name">The charge</span></span></div>
    <div className="cd-view-modes" role="group" aria-label="The charge">{lesson.cases.map(c => <button key={c.key} type="button" className={'cd-view-mode' + (kase.key === c.key ? ' is-on' : '')} aria-pressed={kase.key === c.key} onClick={() => setCaseKey(c.key)}>{c.label}</button>)}</div></div>;
  const toBuild = useSteady(() => { const t = watchButton.current; if (!t) return; t.scrollIntoView({block: 'center', behavior: reduced ? 'auto' : 'smooth'}); t.focus({preventScroll: true}); });
  const toggleLesson = useSteady(() => setLessonOpen(v => !v));
  const running = runOpen ? ' is-running' + (settled ? ' is-settled' : '') : '';
  return <div className={'explorer-app symbolic-view gs-page'}>
    <a className="skip-link" href="#lesson" onClick={e => { e.preventDefault(); document.getElementById(LESSON_TITLE)?.focus(); }}>Skip to the lesson</a>
    <header className="exp-header"><Brand />
      <div className="exp-header-right">
        <button ref={tourButton} type="button" className="text-button tour-button" aria-label="Walkthrough" onClick={() => setRecipe(true)}><CircleHelp size={16} /><span>Walkthrough</span></button>
        <a className="text-button tour-button guide-link" href={GUIDE_HREF} aria-label="How to use this site" onClick={e => { if (!inPlace(e)) return; e.preventDefault(); navigate(GUIDE_HREF); }}><GraduationCap size={16} /><span>How to use</span></a>
        <a className="text-button quiz-link" href={QUIZ_HREF} aria-label="Quiz yourself" onClick={e => { if (!inPlace(e)) return; e.preventDefault(); navigate(QUIZ_HREF); }}><ClipboardCheck size={16} /><span>Quiz</span></a>
        <Hint label={dark ? 'Switch to light theme' : 'Switch to dark theme'}><button className="icon-button" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button></Hint>
        <DropdownMenu><Hint label="Lesson tools"><DropdownMenuTrigger className="icon-button no-print" aria-label="Lesson tools"><MoreHorizontal size={17} /></DropdownMenuTrigger></Hint>
          <DropdownMenuContent className="exp-tools-menu" align="end" sideOffset={8}>
            <DropdownMenuItem onClick={() => { void copyLink(); }}><LinkIcon size={15} />Copy a link to this lesson</DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.print()}><Printer size={15} />Print this lesson</DropdownMenuItem>
          </DropdownMenuContent></DropdownMenu>
      </div>
    </header>
    <SidebarProvider className={`exp-shell ${sidebarOpen ? 'library-expanded' : 'library-collapsed'}`} style={{'--sidebar-width': '196px'} as CSSProperties}>
      {sidebarOpen && <Sidebar collapsible="none" className="exp-sidebar"><SidebarContent><nav className="exp-lessons" aria-label="Lessons">{lessonList}</nav>
        <div className="exp-nav-bottom"><p>One law.<br />Every geometry.</p><MathText tex={String.raw`\oint\vec E\cdot d\vec A=\frac{Q_{\text{enc}}}{\varepsilon_0}`} /><span>Your settings stay on this device.</span></div></SidebarContent></Sidebar>}
      <main id="lesson" className="exp-main">
        <div className="exp-breadcrumb"><Hint label={sidebarOpen ? 'Hide the lesson list' : 'Show the lesson list'}><button type="button" className="exp-library-toggle" aria-expanded={sidebarOpen} aria-label={sidebarOpen ? 'Hide the lesson list' : 'Show the lesson list'} onClick={() => setSidebarOpen(v => !v)}><PanelLeft size={16} /></button></Hint>
          <div className="exp-crumbs"><button type="button" className="exp-crumb-link" aria-haspopup="dialog" aria-expanded={library} onClick={() => setLibrary(true)}><ChevronLeft size={13} aria-hidden="true" />Charge library</button></div></div>
        <div className="exp-heading has-lesson"><div><p className="gs-kicker">{GAUSS.label}</p><h1 id={LESSON_TITLE} tabIndex={-1}>{lesson.title}</h1></div></div>
        <LessonIntro lesson={lesson} open={lessonOpen} onToggle={toggleLesson} onBuild={toBuild} />
        <div className={'exp-workspace' + running}>
          <div className="exp-visual-column">
            <section className={'exp-diagram-card gs-card' + running} aria-label="Interactive Gauss’s law figure">
              <div className="exp-diagram-heading"><div><MathText tex={String.raw`\oint\vec E\cdot d\vec A=\frac{Q_{\text{enc}}}{\varepsilon_0}`} /></div>
                {runOpen && <span className="exp-watch-hold" aria-hidden="true" />}
                {!runOpen && <div className="exp-watch"><span className="exp-watch-note">Five steps, about half a minute</span>
                  <button ref={watchButton} type="button" className="exp-watch-button" onClick={watch} title="Five steps, about half a minute. Pause or step through at any point."><Play size={13} fill="currentColor" strokeWidth={0} />Watch it build</button></div>}
              </div>
              <GaussFigure kase={kase} size={size} sign={sign} run={figureRun} view={printing ? '2d' : view} onView={setView} />
              {runOpen && <div ref={walk} className="exp-walk is-open"><BuildPlayer stages={stages} clock={clock} index={index} playing={playing} math={mathSteps} onPlay={toggle} onSeek={seek} onStep={step} onClose={close} /></div>}
            </section>
            <section className="exp-parameters"><div className="parameter-grid gs-parameters">
              <GaussRange label={kase.figure.surface.label} value={size} min={kase.figure.surface.size.min} max={kase.figure.surface.size.max} step={.01} onChange={setSize} valueText={n => { const s = kase.figure.surface; if (s.regions) return s.regions[regionOf(kase, n)]?.name ?? ''; const f = (n - s.size.min) / (s.size.max - s.size.min); return f < .34 ? 'small' : f < .67 ? 'medium' : 'large'; }} />
              {caseRow}{signRow}
            </div></section>
            {lesson.instrument === 'symmetry' && <SymmetryTest sym={sym} sign={sign} />}
            {lesson.instrument === 'flux' && <FluxInstrument />}
            {lesson.instrument === 'profile' && <FieldProfile kase={kase} size={size} sign={sign} />}
            {lesson.instrument === 'cavity' && <CavityInstrument sign={sign} />}
          </div>
          <GaussBoard kase={kase} flux={lesson.id === 'flux'} build={boardBuild} onStep={boardStep} />
        </div>
        <section className="exp-endnotes" aria-labelledby="gs-endnotes">
          <h2 id="gs-endnotes" className="sr-only">Checks and easy confusions</h2>
          <details className="exp-note" open>
            <summary><span>Check the answer</span><small>Limits, what cancels, the sign: what a right answer has to do.</small></summary>
            <div className="exp-note-body gs-checks">{kase.checks.map(c => <div className="gs-check" key={c.title}><h3 className="exp-note-heading">{c.title}</h3><p><Prose text={c.text} /></p>{c.tex && <MathText tex={c.tex} block />}</div>)}</div>
          </details>
          <details className="exp-note" open>
            <summary><span>Easy to confuse with</span><small>The ideas this step sits next to, and what is true instead.</small></summary>
            <div className="exp-note-body exp-slips">{lesson.traps.map(t => <div className="exp-slip" key={t.wrong}><span className="exp-slip-of"><span className="exp-slip-not">Not</span> <Prose text={t.wrong} /></span><div className="exp-slip-note"><p><Prose text={t.right} /></p></div></div>)}</div>
          </details>
          {next && <a className="exp-next" href={next.href} aria-label={`Next: ${next.name}. ${next.why}`} onClick={e => { if (!inPlace(e)) return; e.preventDefault(); navigate(next.href); }}>
            <span className="exp-next-glyph">{next.glyph}</span>
            <span className="exp-next-words"><span className="exp-next-kicker">Next</span><strong className="exp-next-to">{next.name}</strong><span className="exp-next-why">{next.why}</span></span>
            <ArrowRight className="exp-next-arrow" size={18} aria-hidden="true" />
          </a>}
          {alongside && <a className="exp-next gs-alongside" href={alongside.href} aria-label={`Compare: ${alongside.name}. ${alongside.why}`} onClick={e => { if (!inPlace(e)) return; e.preventDefault(); navigate(alongside.href); }}>
            <span className="exp-next-glyph">{alongside.glyph}</span>
            <span className="exp-next-words"><span className="exp-next-kicker">Compare</span><strong className="exp-next-to">{alongside.name}</strong><span className="exp-next-why"><Prose text={alongside.why} /></span></span>
            <ArrowRight className="exp-next-arrow" size={18} aria-hidden="true" />
          </a>}
        </section>
        <output className="sr-only" aria-live="polite">{status}</output>
      </main>
    </SidebarProvider>
    {copied && <p className="exp-copied no-print" aria-hidden="true">{copied}</p>}
    <Dialog open={recipe} onOpenChange={setRecipe}><DialogContent className="laws-dialog gs-recipe" finalFocus={tourButton}>
      <DialogTitle className="laws-title">How a Gauss lesson goes</DialogTitle>
      <DialogDescription className="laws-lede">The same recipe every time, and the same five steps as Watch it build.</DialogDescription>
      <ol className="gs-recipe-steps">{RECIPE.map(s => <li key={s.name}><strong>{s.name}</strong><span>{s.text}</span></li>)}</ol>
    </DialogContent></Dialog>
    <Dialog open={library} onOpenChange={setLibrary}><DialogContent className="exp-library-dialog">
      <DialogTitle>Choose your geometry</DialogTitle><DialogDescription>Every lesson, including electric potential and Gauss’s law.</DialogDescription>
      <div className="exp-library-list">{families(FIELD_LESSONS).map(g => <div className="exp-library-family" key={g.label}><h3 className="exp-family-name">{g.label}</h3><div className="exp-library-grid">{g.items.map(pr =>
        <a key={pr.id} href={lessonHref(pr.id)} className="exp-library-card" aria-labelledby={`glib-${pr.id}`} aria-describedby={`glib-${pr.id}-about`} onClick={e => goField(pr.id, e)}><ShapeGlyph id={pr.id} size={26} /><strong id={`glib-${pr.id}`}>{pr.short}</strong><span id={`glib-${pr.id}-about`}>{pr.subtitle}</span></a>)}</div></div>)}
        <GaussLibraryFamily current={id} onOpen={() => setLibrary(false)} />
      </div>
    </DialogContent></Dialog>
  </div>;
}
