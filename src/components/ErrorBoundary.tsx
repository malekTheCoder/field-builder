'use client';
import {Component,type ReactNode} from 'react';
import {MotionConfig} from 'motion/react';
import {resetSavedState} from '../state/storage';
export class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean;resetFailed:boolean;detail:string}>{
 state={failed:false,resetFailed:false,detail:''};
 static getDerivedStateFromError(error:unknown){return{failed:true,detail:error instanceof Error?`${error.name}: ${error.message}`:String(error)}}
 // Swallowing the error left nobody able to say what had crashed. It goes to the console
 // for whoever has DevTools open, and its message is shown under the recovery buttons.
 componentDidCatch(error:unknown,info:{componentStack?:string}){console.error('Field Builder view crashed:',error,info.componentStack??'');}
 render(){if(!this.state.failed)return this.props.children;return <main style={{maxWidth:620,margin:'10vh auto',padding:24}}><h1>Field Builder could not display this view</h1><p>Your saved work is still in this browser. Try opening the view again. If the problem continues, reset Field Builder’s saved preferences and practice answers.</p><div style={{display:'flex',flexWrap:'wrap',gap:12}}><button type="button" onClick={()=>this.setState({failed:false,resetFailed:false})}>Try again</button><button type="button" onClick={()=>{if(resetSavedState())this.setState({failed:false,resetFailed:false});else this.setState({resetFailed:true})}}>Reset saved work and try again</button></div>{this.state.detail&&<details style={{marginTop:18,fontSize:13,opacity:.75}}><summary>What went wrong</summary><pre style={{whiteSpace:'pre-wrap',marginTop:8}}>{this.state.detail}</pre></details>}{this.state.resetFailed&&<p role="alert">This browser is blocking access to saved data. Allow site data in your browser settings, or open Field Builder in a new browser window.</p>}</main>}
}
export function AppBoundary({children}:{children:ReactNode}){return <ErrorBoundary><MotionConfig reducedMotion="user">{children}</MotionConfig></ErrorBoundary>}
