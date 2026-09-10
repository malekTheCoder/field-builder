let loader:Promise<unknown>|null=null;
export function loadMathLive(){return loader??=import('mathlive').then(m=>{const E=m.MathfieldElement as unknown as {fontsDirectory:string|null;soundsDirectory:string|null};E.fontsDirectory=new URL('mathlive-fonts/',document.baseURI).href;E.soundsDirectory=null;return m}).catch(error=>{loader=null;throw error})}
