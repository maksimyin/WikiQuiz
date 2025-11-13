Deploying the Proxy (Render) and Building Zips

1) Deploy the Proxy on Render
- Repo contains render.yaml (one-click deploy ready).
- Steps:
  - Push to GitHub.
  - In Render, New → Blueprint → select your repo.
  - Confirm service "wiki-extension-ai-proxy" with rootDir server/.
  - Set env vars under the service (all required):
    - OPENAI_API_KEY = your OpenAI key
    - GEMINI_API_KEY = your Gemini key (optional if you only use OpenAI)
    - PROXY_TOKEN = a random secret (e.g. hex string)
    - CORS_ORIGINS = *
  - Deploy. Wait for health check: /health should return { ok: true }.
  - Note the base URL, e.g. https://your-proxy.onrender.com

2) Point Extension to the Hosted Proxy
- At project root, create .env.production:

  VITE_PROXY_URL=https://your-proxy.onrender.com
  VITE_PROXY_TOKEN=the-same-secret-you-set-on-server
  VITE_FEEDBACK_URL=https://forms.gle/your-form  # optional

3) Build and Package the Extension
- Chrome/Edge:
  npm run build
  npm run zip
- Firefox:
  npm run build:firefox
  npm run zip:firefox

4) Share to Testers
- Manual install:
  - Chrome/Edge: chrome://extensions → Developer mode → Load unpacked → select the built folder containing manifest.json.
  - Firefox: about:debugging#/runtime/this-firefox → Load Temporary Add-on… → select the built manifest.json in dist/firefox-…
- Or upload zip as Unlisted to the stores for easier installs and auto-updates.

Notes
- The extension adds x-proxy-token automatically if VITE_PROXY_TOKEN is set.
- Rate limiting and 30s timeouts are enabled on the proxy.
- Bump version in package.json before each store upload.


