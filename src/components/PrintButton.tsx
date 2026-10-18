import {Printer} from 'lucide-react';

/** PRINTING IS ONE CLICK AWAY ON EVERY PAGE. It lived in a menu behind three dots ("Print this lesson"), and a
 * teacher who wanted the handout had to know to look there. This is the same call, in the header beside the other
 * named buttons: an icon and the word where the header has room, the icon alone where it does not (explorer.css,
 * `.print-button`), and gone from the paper itself. The caller says what is printed and what to run, so a lesson
 * can run its own path and a page without one just calls the browser's. */
export function PrintButton({label,onPrint}:{label:'Print this lesson'|'Print this page';onPrint:()=>void}){
 return <button type="button" className="text-button print-button no-print" aria-label={label} onClick={onPrint}><Printer size={16} aria-hidden="true"/><span>Print</span></button>;
}
