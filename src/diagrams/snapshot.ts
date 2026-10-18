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
/** `drawOnly`: the caller copies the canvas itself, in this same task, and wants no PNG; the layer then says
 * only that it has `drawn`. `minimumWidth` requests a larger backing store for an exported image,
 * without changing its CSS geometry or the live figure’s rendering cost. */
export type SnapshotDetail={url?:string;drawOnly?:boolean;drawn?:boolean;minimumWidth?:number};
/** Ask a layer for its picture. Synchronous: the listener runs inside the dispatch. */
export function snapshotLayer(el:Element,minimumWidth=0):string|undefined{
 const detail:SnapshotDetail={minimumWidth};
 el.dispatchEvent(new CustomEvent<SnapshotDetail>(SNAPSHOT_EVENT,{detail}));
 return detail.url;
}
/** Ask a layer to draw itself afresh, now, and say whether it did -- for a caller that copies the canvas in the
 * same task (the page, as it goes to paper). Printing asked for the picture and copied the canvas instead, so
 * every layer encoded a PNG of itself, a page-sized one in WebGL, for nobody, in the moment before the print. */
export function redrawLayer(el:Element):boolean{
 const detail:SnapshotDetail={drawOnly:true};
 el.dispatchEvent(new CustomEvent<SnapshotDetail>(SNAPSHOT_EVENT,{detail}));
 return !!detail.drawn;
}
