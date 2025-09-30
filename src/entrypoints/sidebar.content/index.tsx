import ReactDOM from 'react-dom/client';
import Sidebar from '../../components/Sidebar';
import { injectPageStyles, removePageStyles } from './page-style';
import './style.css';

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