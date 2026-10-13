import {goHome,HOME_HREF,inPlace} from '../state/route';

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
