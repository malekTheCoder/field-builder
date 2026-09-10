import type {Distribution} from './types';
import {bisector} from './bisector';
import {axial} from './axial';
import {ring,arc} from './ring';
import {disk} from './disk';
// A potential problem is the same charge, the same P and the same samples as its field problem;
// only the quantity the lesson integrates changes. Sharing the module keeps field('v-ring') honest —
// it is the ring's E, which is exactly what the differentiate-back step recovers from V.
const potentialOf=(id:string,d:Distribution):Distribution=>({...d,id});
export const vRing=potentialOf('v-ring',ring);
export const vDisk=potentialOf('v-disk',disk);
export const vArc=potentialOf('v-arc',arc);
export const vRodBisector=potentialOf('v-rod-bisector',bisector);
export const vRodAxial=potentialOf('v-rod-axial',axial);
