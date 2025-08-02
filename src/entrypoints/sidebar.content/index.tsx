import ReactDOM from 'react-dom/client';
import Sidebar from '../../components/Sidebar';
import { injectPageStyles, removePageStyles } from './page-style';
import './style.css';

export default defineContentScript({
    matches: ['*://*.wikipedia.org/wiki/*'],
    cssInjectionMode: 'ui',
    async main(ctx) {
        // Don't inject sidebar on Wikipedia main page
        if (window.location.pathname === '/wiki/Main_Page') {
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
                root.render(<Sidebar />)
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