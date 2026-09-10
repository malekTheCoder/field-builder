'use client';
import {Component,type ReactNode} from 'react';
import {MotionConfig} from 'motion/react';
import {resetSavedState} from '../state/storage';
export class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean;resetFailed:boolean}>{
 state={failed:false,resetFailed:false};
 static getDerivedStateFromError(){return{failed:true}}
 render(){if(!this.state.failed)return this.props.children;return <main style={{maxWidth:620,margin:'10vh auto',padding:24}}><h1>Field Builder could not display this view</h1><p>Your saved work is still in this browser. Try opening the view again. If the problem continues, reset Field Builder’s saved preferences and practice answers.</p><div style={{display:'flex',flexWrap:'wrap',gap:12}}><button type="button" onClick={()=>this.setState({failed:false,resetFailed:false})}>Try again</button><button type="button" onClick={()=>{if(resetSavedState())this.setState({failed:false,resetFailed:false});else this.setState({resetFailed:true})}}>Reset saved work and try again</button></div>{this.state.resetFailed&&<p role="alert">This browser is blocking access to saved data. Allow site data in your browser settings, or open Field Builder in a new browser window.</p>}</main>}
}
export function AppBoundary({children}:{children:ReactNode}){return <ErrorBoundary><MotionConfig reducedMotion="user">{children}</MotionConfig></ErrorBoundary>}
