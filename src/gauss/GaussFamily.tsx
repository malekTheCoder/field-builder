'use client';
/* The list's links are rendered by SidebarMenuButton, which gives each its glyph and name as its content. */
/* oxlint-disable jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label */
import {SidebarMenu, SidebarMenuButton, SidebarMenuItem} from '@/components/ui/sidebar';
import {GAUSS, PlannedGlyph, plannedName} from '../explorer/lessons';
import {PLANNED_LABEL, PLANNED_SECTIONS} from '../problems/readiness';
import {inPlace, navigate} from '../state/route';
import {gaussHref, gaussLesson, isGaussReady} from './index';
import './gauss.css';
/* THE GAUSS FAMILY, WHEREVER THE LESSONS ARE OFFERED: the lesson list, the library and the home page. It was
 * three copies of one block of "Coming soon" names; now that some of its lessons are built, each copy would have
 * had to learn which are links. One component, three dresses, each in the classes of the place it sits in.
 *
 * A ready lesson is a link to `?g=<id>`: a plain click goes there in place (the site switches page, as it does
 * between home and a lesson), a click meant for a new tab is the browser's. The rest are words, marked, and
 * never a stop for Tab. With nothing ready the family's heading carries the mark, as it always did; with some
 * ready, the rest sit under a "Coming soon" line of their own. */
type Entry = {key: string; name: string; about: string; ready: boolean};
const entries = (): Entry[] => GAUSS.lessons.map(l => {
  const built = gaussLesson(l.key);
  return {key: l.key, name: built?.title ?? l.name, about: built?.about ?? l.about, ready: isGaussReady(l.key)};
});
const go = (key: string, after?: () => void) => (e: React.MouseEvent) => { if (!inPlace(e)) return; e.preventDefault(); after?.(); navigate(gaussHref(key)); };

/** In the lesson list: a family of rows, ready ones as the list's own links. `current` marks the lesson open. */
export function GaussListFamily({current}: {current?: string}) {
  if (!PLANNED_SECTIONS.has(GAUSS.key)) return null;
  const all = entries(), ready = all.filter(e => e.ready), soon = all.filter(e => !e.ready);
  return <div className="exp-family exp-planned">
    <h2 className="exp-family-name">{GAUSS.label}{ready.length === 0 && <> <span className="exp-soon-tag">{PLANNED_LABEL}</span></>}</h2>
    {ready.length > 0 && <SidebarMenu>{ready.map(l => <SidebarMenuItem key={l.key}>
      {/* The link is rendered by SidebarMenuButton, which gives it the row's glyph and name as its content. */}
      {/* oxlint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label */}
      <SidebarMenuButton className={'exp-shape-button' + (current === l.key ? ' active' : '')} isActive={current === l.key} aria-current={current === l.key ? 'page' : undefined}
        render={<a href={gaussHref(l.key)} />} onClick={go(l.key)}>
        <span className="shape-icon"><PlannedGlyph id={l.key} /></span><span>{plannedName(l.name)}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>)}</SidebarMenu>}
    {soon.length > 0 && ready.length > 0 && <h3 className="gs-soon-sub">{PLANNED_LABEL}</h3>}
    {soon.length > 0 && <SidebarMenu>{soon.map(l => <SidebarMenuItem key={l.key}>
      <div className="exp-planned-row" aria-disabled="true"><span className="shape-icon"><PlannedGlyph id={l.key} /></span><span>{plannedName(l.name)}</span></div>
    </SidebarMenuItem>)}</SidebarMenu>}
  </div>;
}

/** In the library dialog: cards, ready ones as links. `onOpen` closes the dialog first. */
export function GaussLibraryFamily({current, onOpen}: {current?: string; onOpen?: () => void}) {
  if (!PLANNED_SECTIONS.has(GAUSS.key)) return null;
  const all = entries(), none = !all.some(e => e.ready);
  return <div className="exp-library-family exp-planned">
    <h3 className="exp-family-name">{GAUSS.label}{none && <> <span className="exp-soon-tag">{PLANNED_LABEL}</span></>}</h3>
    <div className="exp-library-grid">{all.map(l => l.ready
      ? <a key={l.key} href={gaussHref(l.key)} className={'exp-library-card' + (current === l.key ? ' selected' : '')} aria-current={current === l.key ? 'page' : undefined}
        aria-labelledby={`lib-g-${l.key}`} aria-describedby={`lib-g-${l.key}-about`} onClick={go(l.key, onOpen)}>
        <PlannedGlyph id={l.key} size={26} /><strong id={`lib-g-${l.key}`}>{plannedName(l.name)}</strong><span id={`lib-g-${l.key}-about`}>{l.about}</span>
      </a>
      : <div key={l.key} className="exp-library-card is-planned" aria-disabled="true"><PlannedGlyph id={l.key} size={26} /><strong>{plannedName(l.name)}</strong><span>{none ? l.about : `${PLANNED_LABEL}. ${l.about}`}</span></div>)}</div>
  </div>;
}

/** On the home page: the family's cards, after the integral families, ready ones as links. */
export function GaussHomeFamily() {
  if (!PLANNED_SECTIONS.has(GAUSS.key)) return null;
  const all = entries(), none = !all.some(e => e.ready);
  return <div className={'home-family' + (none ? ' is-soon' : '')}>
    <div className="home-family-head"><h3 id="home-gauss">{GAUSS.label}{none && <> <span className="home-soon-tag">{PLANNED_LABEL}</span></>}</h3><p>{GAUSS.note}</p></div>
    <ul className="home-grid">{all.map(l => <li key={l.key}>{l.ready
      ? <a className="home-card" href={gaussHref(l.key)} onClick={go(l.key)} aria-labelledby={`home-g-${l.key}`} aria-describedby={`home-g-${l.key}-about`}>
        <span className="home-glyph"><PlannedGlyph id={l.key} size={24} /></span><strong id={`home-g-${l.key}`}>{plannedName(l.name)}</strong><span id={`home-g-${l.key}-about`} className="home-card-about">{l.about}</span>
      </a>
      : <div className="home-card is-soon" aria-disabled="true">
        <span className="home-glyph"><PlannedGlyph id={l.key} size={24} /></span><strong>{plannedName(l.name)}</strong><span className="home-card-about">{l.about}</span><span className="home-card-soon">{PLANNED_LABEL}</span>
      </div>}</li>)}</ul>
  </div>;
}
