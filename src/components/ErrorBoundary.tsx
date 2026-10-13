'use client';
import {Component,createRef,type ReactNode} from 'react';
import {MotionConfig} from 'motion/react';
import {resetSavedState} from '../state/storage';
// THE CRASH SCREEN IS A PAGE OF ITS OWN, AND LOOKS LIKE ONE. It was styled inline under Tailwind's reset, which
// takes every default away: the heading came out at body size and weight, and the two buttons with no border,
// background or padding, so "Try again   Reset saved settings and try again" read as the end of the paragraph
// -- a student who met it saw no way out. It is styled in app/globals.css (.fb-crash) now. And it says what
// happened to the focus's control: that unmounted with the view, the focus fell to the page and nothing was
// announced, so the heading takes the focus as the screen appears. The paragraph and the button both say
// "settings" -- the button said "saved work", which is not what it resets.
export class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean;resetFailed:boolean;detail:string}>{
 state={failed:false,resetFailed:false,detail:''};
 heading=createRef<HTMLHeadingElement>();
 static getDerivedStateFromError(error:unknown){return{failed:true,detail:error instanceof Error?`${error.name}: ${error.message}`:String(error)}}
 // Swallowing the error left nobody able to say what had crashed. It goes to the console
 // for whoever has DevTools open, and its message is shown under the recovery buttons.
 componentDidCatch(error:unknown,info:{componentStack?:string}){console.error('Field Builder view crashed:',error,info.componentStack??'');}
 // A crash in the first render mounts the screen; one later updates to it. Either way the heading has the focus.
 componentDidMount(){if(this.state.failed)this.heading.current?.focus();}
 componentDidUpdate(_:unknown,before:{failed:boolean}){if(this.state.failed&&!before.failed)this.heading.current?.focus();}
 render(){if(!this.state.failed)return this.props.children;return <main className="fb-crash"><h1 ref={this.heading} tabIndex={-1}>Field Builder could not display this view</h1><p>Your saved settings are still in this browser. Try opening the view again. If the problem continues, reset Field Builder’s saved settings.</p><div className="fb-crash-actions"><button type="button" className="fb-crash-primary" onClick={()=>this.setState({failed:false,resetFailed:false})}>Try again</button><button type="button" onClick={()=>{if(resetSavedState())this.setState({failed:false,resetFailed:false});else this.setState({resetFailed:true})}}>Reset saved settings and try again</button></div>{this.state.detail&&<details className="fb-crash-detail"><summary>What went wrong</summary><pre>{this.state.detail}</pre></details>}{this.state.resetFailed&&<p role="alert">This browser is blocking access to saved data. Allow site data in your browser settings, or open Field Builder in a new browser window.</p>}</main>}
}
export function AppBoundary({children}:{children:ReactNode}){return <ErrorBoundary><MotionConfig reducedMotion="user">{children}</MotionConfig></ErrorBoundary>}
