import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  manifest: {
    permissions: ['tabs', 'scripting', 'storage'],
    host_permissions: ['*://*.wikipedia.org/wiki/*'],
    /*
    options_ui: {
      page: 'src/entrypoints/options/options.html'
    },
    */
  },
});
