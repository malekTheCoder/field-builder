import { createRoot } from 'react-dom/client';
import Explorer from './explorer/Explorer';
import {AppBoundary} from './components/ErrorBoundary';
import 'katex/dist/katex.min.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/source-serif-4';
import '../app/globals.css';
import './static-fonts.css';

createRoot(document.getElementById('root')!).render(<AppBoundary><Explorer /></AppBoundary>);
