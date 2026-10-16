'use client';
/* The view modes and the toggles are named groups of buttons, as the integral lessons' toolbar sets them. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label -- and the list's links are rendered by SidebarMenuButton, which gives each its glyph and name. */
import {useCallback, useEffect, useInsertionEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties} from 'react';
import {flushSync} from 'react-dom';
import {useReducedMotion} from 'motion/react';
import {ArrowRight, ChevronLeft, ChevronRight, CircleHelp, ClipboardCheck, GraduationCap, House, Link as LinkIcon, Moon, MoreHorizontal, PanelLeft, Play, Printer, Sun} from 'lucide-react';
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
import {GAUSS, PlannedGlyph, ShapeGlyph, families, plannedName} from '../explorer/lessons';
import {GUIDE_HREF, HOME_HREF, QUIZ_HREF, inPlace, navigate, subscribeAddress} from '../state/route';
import {gaussHref, gaussIdOf, gaussLesson, isGaussReady, type GaussId} from './index';
import {gaussStages, moment, runSeconds, stageStart} from './run';
import {GaussFigure, type FigureView} from './GaussFigure';
import {GaussBoard} from './GaussBoard';
import {BOARD, useBoardFollowsRun} from './useBoardFollow';
import {GaussRange} from './GaussRange';
import {useRenderedWidth} from '../components/useRenderedWidth';
import {SymmetryTest} from './SymmetryTest';
import {FluxInstrument} from './FluxInstrument';
import {FieldProfile} from './FieldProfile';
import {CavityInstrument} from './CavityInstrument';
import {regionOf} from './instruments';
import {InsideInstrument, insideStart} from './InsideInstrument';
import {QencInstrument} from './QencInstrument';
import {FieldPlot} from './FieldPlot';
import {HoleInstrument} from './HoleInstrument';
import {CubeInstrument} from './CubeInstrument';
import {GaussListFamily, GaussLibraryFamily} from './GaussFamily';
import type {Sym} from './instruments';
import type {GaussCase} from './types';
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

/** The surface's size, said aloud: the region it is in, where the lesson names them; else against the charge's own
 * size where it has one; else against the slider's own reach. "Small", "medium" and "large" alone said nothing. */
function sizeText(kase: GaussCase, n: number): string {
  const s = kase.figure.surface, c = kase.figure.charge;
  if (s.regions) return s.regions[regionOf(kase, n)]?.name ?? '';
  const what = s.kind === 'pillbox' ? 'its face' : 'the surface', R = c.size;
  if (R > 0 && c.kind !== 'offset' && c.kind !== 'segment' && c.kind !== 'point') { const t = n / R; return t < .9 ? `${what} inside the charge` : t <= 1.1 ? `${what} about at the charge’s edge` : `${what} outside the charge`; }
  if (c.kind === 'offset') return n > R ? 'the sphere round the charge' : 'the sphere short of the charge';
  const f = (n - s.size.min) / (s.size.max - s.size.min), far = s.kind === 'pillbox' ? 'from the sheet' : 'from the charge';
  return f < .34 ? `close ${far}` : f < .67 ? `partway out ${far}` : `far ${far}`;
}
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
  useEffect(() => { document.title = `${lesson.title.replace('Q_enc', 'Q enc')} · Field Builder`; }, [lesson.title]);
  // A NEW LESSON STARTS AT ITS TOP, its text shut, its first case, its run closed, the focus on its title. The
  // first one is the site's to place (Site.tsx), since it may have come from another page.
  const shown = useRef(id);
  useEffect(() => {
    if (shown.current === id) return;
    shown.current = id;
    window.scrollTo({top: 0, behavior: 'auto'});
    document.getElementById(LESSON_TITLE)?.focus({preventScroll: true});
  }, [id]);

  // THE OPEN LESSON IS IN VIEW IN THE LIST, which scrolls on its own beside the page: a lesson far down it could be open
  // with nothing in the column saying which. Only the list moves, never the page, and only when the row is out of view.
  useEffect(() => {
    const row = document.querySelector<HTMLElement>('.gs-page .exp-lessons [aria-current=page]'), list = row?.closest<HTMLElement>('[data-slot=sidebar-content]');
    if (!row || !list || list.scrollHeight <= list.clientHeight + 1) return;
    const r = row.getBoundingClientRect(), l = list.getBoundingClientRect(), shown = Math.min(l.bottom, window.innerHeight) - Math.max(l.top, 0);
    if (r.top >= Math.max(l.top, 0) && r.bottom <= Math.max(l.top, 0) + shown) return;
    list.scrollTo({top: Math.max(0, list.scrollTop + r.top - l.top - Math.max(80, shown / 2 - r.height)), behavior: 'auto'});
  }, [id, sidebarOpen]);

  // ---- WATCH IT BUILD: the recipe as a run of five stages, on the integral lessons' transport ----
  const stages = useMemo(() => gaussStages(kase), [kase]);
  const total = runSeconds(stages);
  const [clock] = useState(runClock);
  const [runOpen, setRunOpen] = useState(false), [playing, setPlaying] = useState(false), [index, setIndex] = useState(0), [settled, setSettled] = useState(false);
  const loop = useRef<{stop: () => void} | null>(null), at = useRef({at: 0, stopAt: 0}), said = useRef(-1), quiet = useRef(false), reveal = useRef(false), stoppedByRun = useRef(false);
  const apply = (t: number) => {
    clock.set(t);
    const m = moment(stages, t);
    setIndex(m.index); setSettled(m.index === stages.length - 1 && m.progress >= .999);
    if (m.index !== said.current) { said.current = m.index; if (!quiet.current) setStatus(`${stages[m.index].name}. ${stages[m.index].line}`); }
  };
  const holdStatus = (ended = false) => { const m = moment(stages, clock.get()); setStatus(ended ? `${stages[m.index].caption} The answer is now at the foot of the board.` : stages[m.index].caption); };
  const stop = () => { loop.current?.stop(); loop.current = null; stoppedByRun.current = false; setPlaying(false); };
  function play(from: number, until: number) {
    loop.current?.stop(); loop.current = null; stoppedByRun.current = false;
    setRunOpen(true); setPlaying(true);
    at.current = {at: from, stopAt: until};
    const done = () => { loop.current = null; stoppedByRun.current = true; setPlaying(false); holdStatus(at.current.at >= total - .01); };
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
  // A step played from the board is played on the figure, and the figure is brought into view to show it: on a
  // phone the board is under the figure and the instrument, and the run played off the screen.
  const boardStep = useSteady((i: number) => {
    stepTo(i);
    const drawing = document.querySelector<HTMLElement>('.gs-page .exp-diagram-card .cd-stage');
    if (!drawing) return;
    const r = drawing.getBoundingClientRect(), h = window.innerHeight;
    if (r.top < 0 || r.bottom > h) window.scrollBy({top: r.top < 0 || r.height > h - 24 ? r.top - 12 : r.bottom - h + 12, behavior: reduced ? 'auto' : 'smooth'});
  });
  const close = useSteady(() => { stop(); setRunOpen(false); clock.set(0); setIndex(0); setSettled(false); said.current = -1; requestAnimationFrame(() => watchButton.current?.focus({preventScroll: true})); });
  const watch = () => { reveal.current = true; play(0, total); };
  // Opened from the button, the focus goes to the play button, the control just pressed in its new place, and the
  // transport is brought into view if it opened below the window. And beside the board, the page goes up until the
  // board reaches its sticky top, as far as the drawing can spare: lower, the board's foot (and the answer, at the
  // end) was under the window, where its own scrolling could not bring it. As the integral lessons' run opens.
  useLayoutEffect(() => {
    if (!runOpen || !reveal.current) return;
    reveal.current = false;
    const player = walk.current;
    player?.querySelector<HTMLButtonElement>('.bp-play')?.focus({preventScroll: true});
    const over = (player?.getBoundingClientRect().bottom ?? 0) + 16 - window.innerHeight;
    const panel = document.querySelector<HTMLElement>(BOARD), style = panel ? getComputedStyle(panel) : null;
    const lift = panel && style?.overflowY === 'auto' ? panel.getBoundingClientRect().top - (parseFloat(style.top) || 0) : 0;
    const drawing = player?.closest('.exp-diagram-card')?.querySelector('.cd-stage'), room = Math.max(0, (drawing?.getBoundingClientRect().top ?? 0) - 12);
    const want = room > 0 ? Math.min(Math.max(over, lift), room) : over;
    if (want > 1) window.scrollBy({top: want, behavior: reduced ? 'auto' : 'smooth'});
  }, [runOpen, reduced]);
  // UNDER THE FIGURE (a phone, a narrow window) the transport carries the stage's algebra and grows with it: it is
  // looked at again at every stage and at the settle, and the page goes down only while it runs off the window's foot,
  // never so far that the drawing's top goes, so a reader who scrolled away to read is left there.
  useEffect(() => {
    if (!runOpen) return;
    const player = walk.current;
    const board = document.querySelector<HTMLElement>(BOARD);
    if (!player || (board && getComputedStyle(board).overflowY === 'auto')) return;
    const t = window.setTimeout(() => {
      const over = player.getBoundingClientRect().bottom + 16 - window.innerHeight;
      const drawing = player.closest('.exp-diagram-card')?.querySelector('.cd-stage'), room = Math.max(0, (drawing?.getBoundingClientRect().top ?? 0) - 12);
      const by = Math.min(over, room);
      if (by > 1 && over < window.innerHeight) window.scrollBy({top: by, behavior: reduced ? 'auto' : 'smooth'});
    }, reduced ? 0 : 120);
    return () => window.clearTimeout(t);
  }, [runOpen, index, settled, reduced]);
  useBoardFollowsRun({open: runOpen, index, settled, playing, reduced: !!reduced, stoppedByRun});
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
  // On a Gauss page its own family leads the list: below every integral lesson it sat a screen and more down, and a
  // reader could not see where the section went next.
  const lessonList = useMemo(() => <><GaussListFamily current={id} />{families(FIELD_LESSONS).map(g => <div className="exp-family" key={g.label}><h2 className="exp-family-name">{g.label}</h2><SidebarMenu>{g.items.map(pr => <SidebarMenuItem key={pr.id}>
    <SidebarMenuButton className="exp-shape-button" render={<a href={lessonHref(pr.id)} />} onClick={(e: React.MouseEvent) => goField(pr.id, e)}><span className="shape-icon"><ShapeGlyph id={pr.id} /></span><span>{pr.short}</span></SidebarMenuButton>
  </SidebarMenuItem>)}</SidebarMenu></div>)}</>, [id, goField]);
  const next = lesson.next && isGaussReady(lesson.next) ? {href: gaussHref(lesson.next), glyph: <PlannedGlyph id={lesson.next} size={22} />, name: gaussLesson(lesson.next)!.title, why: gaussLesson(lesson.next)!.about}
    : lesson.related && isReady(lesson.related.field) ? {href: lessonHref(lesson.related.field), glyph: <ShapeGlyph id={lesson.related.field} size={22} />, name: PROBLEMS.find(p => p.id === lesson.related!.field)?.short ?? '', why: lesson.related.text}
    // The last lesson leads home, to every lesson and the quiz.
    : lesson.onward === 'home' ? {href: HOME_HREF, glyph: <House size={22} aria-hidden="true" />, name: 'Every lesson', why: 'The Gauss section is done: back to the home page, every lesson and the quiz.'} : null;
  // An integral lesson to read beside this one: the same field, built the long way.
  const alongside = lesson.alongside && isReady(lesson.alongside.field) ? {href: lessonHref(lesson.alongside.field), glyph: <ShapeGlyph id={lesson.alongside.field} size={22} />, name: PROBLEMS.find(p => p.id === lesson.alongside!.field)?.short ?? '', why: lesson.alongside.text} : null;
  const sym: Sym = kase.key === 'line' ? 'line' : kase.key === 'plane' ? 'plane' : 'sphere';
  const signRow = <div className="exp-range gs-choice"><div><span><span className="exp-name">Sign of the charge</span></span></div>
    <div className="cd-view-modes" role="group" aria-label="Sign of the charge">{([['Positive', 1], ['Negative', -1]] as const).map(([label, value]) => <button key={label} type="button" className={'cd-view-mode' + (sign === value ? ' is-on' : '')} aria-pressed={sign === value} onClick={() => setSign(value)}>{label}</button>)}</div></div>;
  const caseRow = lesson.cases.length > 1 && <div className="exp-range gs-choice is-cases"><div><span><span className="exp-name">The charge</span></span></div>
    <div className="cd-view-modes" role="group" aria-label="The charge">{lesson.cases.map(c => <button key={c.key} type="button" className={'cd-view-mode' + (kase.key === c.key ? ' is-on' : '')} aria-pressed={kase.key === c.key} onClick={() => setCaseKey(c.key)}>{c.label}</button>)}</div>
    {/* The buttons name the cases; this says what the chosen one IS, in a sentence. "No edge" or "Backwards"
        alone left a reader guessing, so the chosen charge is described under them, and read aloud with them. */}
    <p className="gs-choice-about" aria-live="polite">{kase.figure.charge.name ? kase.figure.charge.name.charAt(0).toUpperCase() + kase.figure.charge.name.slice(1) + '.' : ''}</p></div>;
  const toBuild = useSteady(() => { const t = watchButton.current; if (!t) return; t.scrollIntoView({block: 'center', behavior: reduced ? 'auto' : 'smooth'}); t.focus({preventScroll: true}); });
  const toggleLesson = useSteady(() => setLessonOpen(v => !v));
  const running = runOpen ? ' is-running' + (settled ? ' is-settled' : '') : '';
  // The instruments draw in a viewBox about six hundred and forty units wide: their names are held to twelve pixels
  // on screen at the least, the smallest of them (fourteen units) scaled up as the card narrows.
  const [instrumentsRef, instrumentsWidth] = useRenderedWidth(720);
  const instrumentK = Math.max(1, Math.min(2.2, .86 * 640 / Math.max(1, instrumentsWidth - (instrumentsWidth < 560 ? 28 : 50))));
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
          <div className="exp-crumbs"><button type="button" className="exp-crumb-link" aria-haspopup="dialog" aria-expanded={library} onClick={() => setLibrary(true)}><ChevronLeft size={13} aria-hidden="true" />Charge library</button>
            {/* The section is said in the crumb row, as a family is placed, not as a line of its own above the title:
                that line cost the figure thirty pixels of the first screen, and no other page on the site has one. */}
            <ChevronRight size={13} aria-hidden="true" /><span className="gs-crumb-here">{GAUSS.label}</span></div></div>
        <div className="exp-heading has-lesson"><div><h1 id={LESSON_TITLE} tabIndex={-1}>{plannedName(lesson.title)}</h1></div></div>
        <LessonIntro lesson={lesson} open={lessonOpen} onToggle={toggleLesson} onBuild={toBuild} />
        <div className={'exp-workspace' + running}>
          <div className="exp-visual-column">
            <section className={'exp-diagram-card gs-card' + running} aria-label="Interactive Gauss’s law figure">
              <div className="exp-diagram-heading"><div><MathText tex={String.raw`\oint\vec E\cdot d\vec A=\frac{Q_{\text{enc}}}{\varepsilon_0}`} /></div>
                {runOpen && <span className="exp-watch-hold" aria-hidden="true" />}
                {!runOpen && <div className="exp-watch"><span className="exp-watch-note">Five steps, about half a minute</span>
                  <button ref={watchButton} type="button" className="exp-watch-button" onClick={watch} title="Five steps, about half a minute. Pause or step through at any point."><Play size={13} fill="currentColor" strokeWidth={0} />Watch it build</button></div>}
              </div>
              <GaussFigure key={id} kase={kase} size={size} sign={sign} siblings={lesson.cases} run={figureRun} view={printing ? '2d' : view} onView={setView} />
              {runOpen && <div ref={walk} className="exp-walk is-open"><BuildPlayer stages={stages} clock={clock} index={index} playing={playing} math={mathSteps} onPlay={toggle} onSeek={seek} onStep={step} onClose={close} /></div>}
            </section>
            <section className="exp-parameters"><div className="parameter-grid gs-parameters">
              {caseRow}
              <GaussRange label={kase.figure.surface.label} value={size} min={kase.figure.surface.size.min} max={kase.figure.surface.size.max} step={.01} onChange={setSize} valueText={n => sizeText(kase, n)} />
              {signRow}
            </div></section>
            <div className="gs-instruments" ref={instrumentsRef as unknown as React.Ref<HTMLDivElement>} style={{'--cd-k': instrumentK} as CSSProperties}>
            {lesson.instrument === 'symmetry' && <SymmetryTest sym={sym} sign={sign} />}
            {lesson.instrument === 'flux' && <FluxInstrument />}
            {lesson.instrument === 'profile' && <FieldProfile kase={kase} size={size} sign={sign} />}
            {lesson.instrument === 'cavity' && <CavityInstrument sign={sign} />}
            {lesson.instrument === 'inside' && <InsideInstrument key={kase.key} sign={sign} start={insideStart(kase.key)} />}
            {lesson.instrument === 'qenc' && <QencInstrument />}
            {lesson.instrument === 'plot' && <FieldPlot kase={kase} size={size} sign={sign} />}
            {lesson.instrument === 'hole' && <HoleInstrument sign={sign} />}
            {lesson.instrument === 'cube' && <CubeInstrument sign={sign} />}
            </div>
          </div>
          <GaussBoard kase={kase} flux={lesson.id === 'flux' || lesson.id === 'inside' || lesson.id === 'runs-out'} build={boardBuild} onStep={boardStep} />
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
