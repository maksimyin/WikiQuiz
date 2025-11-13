import ReactDOM from 'react-dom/client';
import Sidebar from '../../components/Sidebar';
import { injectPageStyles, removePageStyles } from './page-style';
import './style.css';
import {ErrorBoundary} from 'react-error-boundary';
import { browser } from 'wxt/browser';
import type { ErrorInfo } from 'react';

function SidebarFallback({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
    // Style nicer
    return (
        <div style={{padding: '20px'}}>
            <h1>Sidebar Error</h1>
            <p>An error occurred while loading the sidebar. Please try again.</p>
            <button onClick={resetErrorBoundary}>Reset</button>
        </div>
    )
}

const onBoundaryError = (error: Error, info: ErrorInfo) => {
    console.error('Sidebar ErrorBoundary:', error, info);
    try {
      browser.runtime.sendMessage({
        type: 'clientError',
        payload: {
          surface: 'sidebar',
          message: error.message,
          stack: error.stack,
          componentStack: info.componentStack ?? '',
          url: location.href,
        },
      });
    } catch {}
  };

export default defineContentScript({
    matches: ['*://*.wikipedia.org/wiki/*'],
    cssInjectionMode: 'ui',
    async main(ctx) {

        const mainPagePatterns = [
            '/wiki/Main_Page',        
            '/wiki/Wikipedia:Portada',  
            '/wiki/Wikipédia:Accueil_principal',
            '/wiki/Wikipedia:Hauptseite', 
            '/wiki/Wikipedia:首页',
            "/wiki/Заглавная_страница",
            "/wiki/Pagina_principale",
            "/wiki/Strona_główna",
        ];
        
        if (mainPagePatterns.some(pattern => window.location.pathname === pattern)) {
            return;
        }
        
        const ui = await createShadowRootUi(ctx, {
            name: 'wiki-ai-sidebar',
            position: 'overlay',
            anchor: 'body',
            onMount: (container) => {
                injectPageStyles();

                const app = document.createElement('div');
                container.append(app);
                container.id = "wiki-ai-root";

                const root = ReactDOM.createRoot(app);
                root.render(<ErrorBoundary FallbackComponent={SidebarFallback} onError={onBoundaryError}>
                    <Sidebar />
                </ErrorBoundary>)
                return root;
            },
            onRemove: (root) => {
                removePageStyles();
                root?.unmount();
            }
        })
        ui.mount();
    }
})