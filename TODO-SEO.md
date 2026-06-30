# Pending Manual Activities — SEO, Deploy & Growth

These are the steps that **cannot be done from code** (they need a browser login, an
external account, DNS, or a one-time dashboard action). The code-side SEO,
performance, and growth work is already implemented and deployed.

Live site: **https://rahuldas-dev.github.io/learnml/**

---

## 1. GitHub Pages — confirm it's serving (one-time)
- [ ] Repo **Settings → Pages → Source = "Deploy from a branch" → `gh-pages` / `root`** → Save.
- [ ] Wait ~1 min, reload the live URL. (After this, every push to `main` auto-redeploys.)

## 2. Search Console — get indexed
> Important: this is a **project** Pages site under `/learnml/`, so crawlers read
> `robots.txt` from the **domain root** (`rahuldas-dev.github.io/robots.txt`), NOT our
> subpath. So the sitemap must be submitted manually.
- [ ] Add the property in **Google Search Console** (URL-prefix: `https://rahuldas-dev.github.io/learnml/`).
- [ ] Submit the sitemap: `https://rahuldas-dev.github.io/learnml/sitemap.xml`.
- [ ] Use **URL Inspection → Request indexing** for the home page.
- [ ] (Optional) Repeat for **Bing Webmaster Tools**.

## 3. Analytics — enable (free, privacy-friendly)
- [ ] Create a free site at https://www.goatcounter.com/ (or Umami/Plausible).
- [ ] In `index.html`, uncomment the analytics block and set your `data-goatcounter` code.
- [ ] Commit + push; confirm a test visit registers in the dashboard.

## 4. GitHub repo discoverability
- [ ] Add repo **topics**: `gemini-nano`, `chrome-ai`, `on-device-ai`, `data-science`,
      `mock-test`, `machine-learning`, `react`.
- [ ] Set the repo **description** (e.g. "Free on-device AI Data Science mock tests & topic
      explainers, powered by Chrome's Gemini Nano").
- [ ] Add the repo **About → Website** link to the live URL.
- [ ] Upload a **Social preview** image (Settings → Social preview) — can reuse
      `public/og-image.png`.

## 5. Validate after deploy (each significant release)
- [ ] **Lighthouse** (Chrome DevTools) on the live URL — target SEO ~100, good Performance/LCP, PWA installable.
- [ ] **PageSpeed Insights** — confirm Core Web Vitals improved vs the old single-file build.
- [ ] **Google Rich Results Test** — `WebApplication` + `FAQPage` JSON-LD valid.
- [ ] **Social card** — paste the URL into opengraph.xyz / X Card Validator / Facebook Sharing Debugger; confirm title, description, and `og-image.png` render.
- [ ] `…/learnml/robots.txt` and `…/learnml/sitemap.xml` load (200).
- [ ] In a browser **without** Gemini Nano (e.g. Firefox), confirm the red capability banner appears on the landing page.

## 6. Launch & distribution (one-time growth pushes)
- [ ] Submit to **Google's Chrome Built-in AI showcase/gallery** (strongest fit — on-device AI).
- [ ] **Product Hunt** launch.
- [ ] **"Show HN"** post on Hacker News.
- [ ] Share in **r/datascience** and **r/learnmachinelearning**.
- [ ] Write a **dev.to / Medium** build post ("on-device AI quiz app with Gemini Nano") for backlinks.

## 7. Optional / later
- [ ] Custom domain (e.g. `datasciencelearn.app`) via a `CNAME` file for stronger ranking + trust
      (would also let `robots.txt` live at the true domain root). Requires buying a domain + DNS.
- [ ] Replace the data-URI favicon with a branded PNG/ICO set if desired.

---

### Already done in code (no action needed)
Meta/description/keywords, Open Graph + Twitter cards, `og-image.png`, JSON-LD
(`WebApplication` + `FAQPage`), `robots.txt`, `sitemap.xml`, PWA `manifest.webmanifest`,
crawlable `#root` + `<noscript>` content, code-split build (singlefile dropped, lazy routes),
semantic landmarks + Features/FAQ sections, capability red-flag banner, results Share button,
GitHub Pages deploy workflow.
