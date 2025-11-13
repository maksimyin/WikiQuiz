// wxt.config.ts
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  manifest: {
    permissions: ["scripting", "storage"],
    host_permissions: ["*://*.wikipedia.org/wiki/*"],
  },
});
