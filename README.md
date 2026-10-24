# SHOPT

Detta o scrivi la spesa: SHOPT la divide per tipo di negozio, confronta i prezzi e ti indica il negozio vicino dove comprare tutto.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4215223a-3a4b-4056-a619-0aea34c809f9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

Requires Node.js 22 (Vite 8 does not run on Node 18).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i          # .npmrc sets legacy-peer-deps: without it npm 10 fails resolving peers
npm run dev    # http://localhost:5173
npm test
```

No login or API keys are needed (see `AGENTS.md`). Shopcoin wallet and posts are a demo: they are stored only in the browser, and the other community members are simulated.

Data sources:
- Prices: [Open Prices](https://prices.openfoodfacts.org) (Open Food Facts, ODbL). Products without a recent reading show an estimated price, labelled as such.
- Stores, street names and address search: [OpenStreetMap](https://www.openstreetmap.org/copyright) via Nominatim (max 1 request/s).
- Approximate location while waiting for GPS: GeoJS / ipapi.co.

To refresh prices and logos: `node --experimental-strip-types scripts/update-catalog.ts`.
