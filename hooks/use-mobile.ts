import * as React from 'react';

const MOBILE_QUERY = '(max-width: 767px)';
const subscribe = (notify: () => void) => {const mql = window.matchMedia(MOBILE_QUERY);mql.addEventListener('change', notify);return () => mql.removeEventListener('change', notify)};
const snapshot = () => window.matchMedia(MOBILE_QUERY).matches;
export function useIsMobile() {return React.useSyncExternalStore(subscribe, snapshot, () => false)}
