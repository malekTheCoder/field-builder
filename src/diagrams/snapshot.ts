/** A picture of a layer the SVG cannot carry, for the offline copy of a lesson.
 *
 * The figure is an SVG over two kinds of pixels -- the flat field on a canvas and the scene in
 * WebGL -- and an SVG saved on its own loses both: the copy came out with no field lines on any
 * lesson and no ring, disk or sheet at all on the three that open in space. Each layer answers
 * this event, dispatched on its own element, by drawing itself afresh and handing back a PNG.
 *
 * Drawn afresh rather than read back, for two reasons: a WebGL buffer is only readable in the
 * task that rendered it, and the copy is always made in the light theme -- paper is white
 * whatever the screen is -- so whatever is on screen may be the wrong colours. The layer puts
 * its own picture back on the next frame. */
export const SNAPSHOT_EVENT='field-builder:snapshot';
export type SnapshotDetail={url?:string};
/** Ask a layer for its picture. Synchronous: the listener runs inside the dispatch. */
export function snapshotLayer(el:Element):string|undefined{
 const detail:SnapshotDetail={};
 el.dispatchEvent(new CustomEvent<SnapshotDetail>(SNAPSHOT_EVENT,{detail}));
 return detail.url;
}
