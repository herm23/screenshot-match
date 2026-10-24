# Screenshot Match

Implement exactly the screenshot and nothing else

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

The app uses fake data only (see `AGENTS.md`): no login or API keys are needed.
