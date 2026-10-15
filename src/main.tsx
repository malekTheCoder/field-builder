import { createRoot } from 'react-dom/client';
import Site from './home/Site';
import {AppBoundary} from './components/ErrorBoundary';
import 'katex/dist/katex.min.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/geist-mono';
import '../app/globals.css';
import './static-fonts.css';

createRoot(document.getElementById('root')!).render(<AppBoundary><Site /></AppBoundary>);
