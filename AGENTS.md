<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep shared shopping data contracts in `src/features/shopping/models.ts`, dictation in its hook, and a single reusable map renderer (`SupermarketMap`, which lazy-loads Leaflet client-only).
- Pages: `/` (home with the Microfono and Mappa cards), `/microfono` (dictation, shopping list, offers) and `/mappa` (OpenStreetMap, nearby supermarkets). They share text, list, position and nearby results through `ShoppingProvider` in `__root.tsx`, so navigating between them keeps the state.
- This is a demo with fake data: no login, no Lovable Cloud, no API keys. Product extraction, offers, supermarkets and geocoding are simulated in `src/features/shopping/fake-data.ts`; dictation and geolocation use the real browser APIs.
- Visual style mirrors the separate Blazor project (HackatonProj): dark by default with a light/dark toggle, orange/violet accents, Space Grotesk + Inter. Theme tokens live in `src/styles.css`.
