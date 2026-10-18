/** A printed handout has no address bar, so give it a short, typeable way back to the lesson.
 * The caller supplies the lesson and current Gauss case only: numerical slider values do not
 * belong on the symbolic page. Use the published site even when printing a local saved build. */
export function PrintLessonLink({href}:{href:string}){
 const address=`https://learnem.malekswilam.dev/${href}`;
 return <p className="print-lesson-link">Explore this lesson: <a href={address}>{address}</a></p>;
}
