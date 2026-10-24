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

The app is **SHOPT** (logo in `src/assets`, colours from the logo in `src/styles.css`). No login, no Lovable Cloud, no API keys.

- `src/features/shopping/catalog.ts`: generic products, the four lists (alimentari, casa, elettronica, faidate), chains and the store types that sell each list. Shared with `scripts/update-catalog.ts`, so no `@/` imports there.
- `src/features/shopping/data/open-prices.json` and `logos/`: real prices from Open Prices (ODbL) and chain logos, regenerated with `node --experimental-strip-types scripts/update-catalog.ts`. Prices without a real reading are estimated in `pricing.ts` and must stay labelled as estimates in the UI.
- `pricing.ts`: one store per list. The recommended store is the nearby one with the most products, nearest on ties; the list total counts only what can be bought there.
- `places.ts`: real stores from OpenStreetMap via Nominatim (at most one request per second, sequential, supermarkets first); missing store types are filled with demo stores marked as such. Overpass was too slow for live use.
- `geo.ts` and `ShoppingProvider.tsx`: automatic location (last saved position, IP estimate while waiting, then high-accuracy `watchPosition` until ±25 m), street names and address search through Nominatim.
- Pages: `/` (home with the Shopcoin balance and the mascot tutorial), `/microfono` (dictation or keyboard, Enter adds to the list, lists by category, product pop-up with offers), `/social` (map with stores and community posts, leaderboard, post composer) and `/portafoglio` (profile QR, voucher redemption, simulated checkout scan, history). State is shared through `ShoppingProvider` and `CommunityProvider` in `__root.tsx`.
- Shopcoin (`src/features/community/rewards.ts`): 1 SC per euro paid, 15 SC per post (5 rewarded posts a day), 20 SC = 1 €, stackable vouchers. Leaderboard "storico" = coins earned without redemptions, "saldo" = current balance. There is no backend: the user's wallet and posts live in localStorage, other community members are simulated in `community-data.ts`.
- Leaflet marker image rules live outside `@layer` in `styles.css`, because unlayered `leaflet.css` would otherwise override them.
