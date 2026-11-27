# One mobile editorial layout at every width

Public baseline: 84d8679. Work branch: design/unified-single-column-2026-11-11. No production merge or manual deployment authorised.

## Confirmed reference
The original request described full-width, gap-free mobile images, but the actual approved mobile stylesheet uses 92% width, 56 px between figures and captions below the images. The owner explicitly chose: “Conservar el móvil actual y replicarlo en escritorio”. This implementation follows that decision: it does not turn mobile into a new full-bleed or caption-overlay design.

## Changes
- editorial.css: append rules only for widths >=601 px, reusing mobile layout values: one 92%-wide column, 56 px gaps, the same frame ratios/object positions, external category/name labels and typography. Carry over mobile header, arrows, invitation alignment/scale, CTA and footer layout. The mobile <=600 px stylesheet stays unchanged.
- index.html: flatten only the desktop gallery's two column wrappers and place its existing eight figures in mobile reading order. Every figure's content is preserved verbatim, including all sources, captions, translations and Talaia off/on images. This makes both visible and keyboard/screen-reader order top-to-bottom. The compact/mobile markup and all HTML outside this desktop gallery are unchanged.
- editorial-effects.js: two decorative breakpoint constants follow the gallery change (1100/1101 to 600/601) so the arrow measures the visible image and image focus works with a cursor. No form/controller code changes.
- scripts/test-editorial-v2-browser.mjs: update the existing gallery validation entry point to the new approved layout, instead of retaining superseded two-column geometry assertions.

## Images, pointer and accessibility
Order: Tramuntana, Binari, Fil, Fita, Cova, Fil (existing technical Arrel ID), Racó, Talaia. Preserve the exact existing mobile framing, including its current Fil/rosette/Talaia crops; original image files and proportions are not edited or distorted. Wider screens now use those same existing mobile frames.

Cursor devices retain the current 20%-to-original saturation and 1.05 internal zoom, smooth transitions and Talaia off/on fade. Labels stay outside and visible, matching mobile. Keyboard focus also activates the existing image effects, with visible focus. Coarse/no-hover devices remain full colour, without persistent zoom; Talaia remains off. Reduced-motion preference removes transitions/zoom as before. Frame overflow clips zoom and no figure moves.

## Safety and validation

Passed locally: 256 Node tests, all 396 Public forms regression scenarios and all 24 gallery cases, including exact mobile PNG comparisons.
No changes to styles.css (forms), integrations.js, script.js, server, functions, legal copy, welcome/career confirmation pages, environments, original images or provider integrations. No real subscriptions, email or remote database writes.

The gallery suite covers 24 cases: ES/EN, widths 390/600/601/768/1024/1100/1101/1440/1920/2560, touch and reduced-motion variants. It checks one column, reading order, exact mobile width/gaps/framing/caption styles, real decoded images, cursor/keyboard effects, Talaia fade, touch behaviour, arrows and no horizontal overflow. Mobile screenshots at 390 and 600 px compare pixel-for-pixel against baseline 84d8679; decorative arrow animations are paused only for deterministic test captures. Content outside the desktop gallery is also compared verbatim with the baseline.

Run after building:

```sh
sh scripts/build-preview.sh
npm test
node scripts/test-editorial-v2-browser.mjs
node scripts/test-public-forms.mjs
```

Playwright/Chromium use the existing PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE overrides if needed. The gallery baseline comparison requires baseline commit 84d8679 to be available in local Git history. The public form runner remains fully simulated. Hosted Actions and actual production provider delivery are separate checks.

## Preview
Local screenshot directory: /workspace/artifacts/cim-unified-column. It includes desktop top/middle/full-page views and mobile before/after captures.

A live Pages preview requires access to the project's branch Preview deployment. Use Cloudflare Pages → cim-studio-private-access-website → Deployments → filter this work branch and select its Preview deployment → Visit. Never select the production branch or modify production settings to obtain it. This environment has not verified an automatic preview URL; screenshots are the verified visual preview. If preview branch builds are not enabled, an owner must explicitly allow this branch in the existing Pages preview settings before obtaining a navigable URL. No account settings have been changed.
