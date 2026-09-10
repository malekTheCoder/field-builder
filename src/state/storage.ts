export function resetSavedState():boolean {
 try{const store=window.localStorage;const keys=Array.from({length:store.length},(_,i)=>store.key(i));for(const key of keys)if(key?.startsWith('field-builder:'))store.removeItem(key);return true}catch{return false}
}
