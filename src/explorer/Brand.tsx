import {ClipboardCheck,GraduationCap} from 'lucide-react';
import {goHome,GUIDE_HREF,HOME_HREF,QUIZ_HREF,inPlace,navigate} from '../state/route';

/** THE NAME IN THE CORNER IS THE WAY HOME, as it is on nearly every site a reader has used. It was a
 * label that went nowhere, and the root address opened straight into the last lesson, so the site had no
 * front page to go back to. It is a link to the home page now, from every page: a plain click goes there
 * in place; a click meant for a new tab is the browser's. On the home page itself it says that it is the
 * page the reader is on. */
export function Brand({current=false}:{current?:boolean}){
 return <a className="exp-brand" href={HOME_HREF} aria-label="Field Builder home" aria-current={current?'page':undefined}
  onClick={e=>{if(!inPlace(e))return;e.preventDefault();if(!current)goHome();else window.scrollTo({top:0})}}>
  <span className="exp-logo" aria-hidden="true">∫</span><span aria-hidden="true">field<span className="brand-light">builder</span></span>
 </a>;
}

/** THE SAME HEADER LINKS ON EVERY PAGE. A lesson's header had How to use and Quiz; the home page, the guide
 * and the quiz had only the theme, so the way between them changed with the page. These are the lesson's two
 * links, in its words and order, for the pages that have no Walkthrough or Lesson tools beside them; the page
 * the reader is on is marked, and stays a link, as the name in the corner does on the home page. On a phone,
 * where a lesson moves them into its menu, these keep their icons and drop their words. */
export function SiteLinks({current}:{current?:'guide'|'quiz'}){
 const go=(href:string)=>(e:React.MouseEvent<HTMLAnchorElement>)=>{if(!inPlace(e))return;e.preventDefault();if(href===(current==='guide'?GUIDE_HREF:current==='quiz'?QUIZ_HREF:''))window.scrollTo({top:0});else navigate(href)};
 return <>
  <a className="text-button site-link" href={GUIDE_HREF} aria-label="How to use this site" aria-current={current==='guide'?'page':undefined} onClick={go(GUIDE_HREF)}><GraduationCap size={16} aria-hidden="true"/><span>How to use</span></a>
  <a className="text-button site-link" href={QUIZ_HREF} aria-label="Quiz yourself" aria-current={current==='quiz'?'page':undefined} onClick={go(QUIZ_HREF)}><ClipboardCheck size={16} aria-hidden="true"/><span>Quiz</span></a>
 </>;
}
