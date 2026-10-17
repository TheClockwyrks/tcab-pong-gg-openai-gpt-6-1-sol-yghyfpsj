# Carom

A browser-only paddle duel about spin, angles, and bank shots. Play against the
machine in Solo or challenge a friend on the same keyboard in Versus. Moving
through a paddle hit curves the ball; two swaying, rotating obstacles change the
available lanes. First to 11, win by two.

## Run locally

Requires a current Node.js version supported by Vite.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Nothing is fetched by the game: its graphics
are canvas drawing commands and its four sound cues are synthesized.

## Production

```sh
npm run build
npm run preview
```

The build writes a self-contained static site to `dist/`. Serve that directory at
the root of any static web server; no backend or credentials are needed.

## Controls

| Input | Effect |
| --- | --- |
| W / S | Left paddle |
| ↑ / ↓ | Right paddle in Versus; also left paddle in Solo |
| Enter / Space | Confirm menu choice |
| W / S or ↑ / ↓ | Select menu choice |
| P / Escape | Pause or resume |
| Escape | Back from instructions or match results |
| M | Toggle sound |
| Backtick | Engine diagnostics overlay |

Menus also accept mouse clicks and touch taps. On touch devices, the engine
provides vertical paddle sliders and menu controls. A ball waits one second
before each serve; paddles can move during that wait.

## Development

The immutable simulation, oriented-rectangle collision, menus, renderer, and
debug surface are separate modules under `src/`. The Simple 2D engine owns
input, audio, canvas fitting, recording, and the frame clock. All fixed game
figures come from the supplied `src/constants.ts`.

- `npm run typecheck` — TypeScript
- `npm run lint` — ESLint
- `npm run format` — Prettier check
- `npm test` — engine-driven Vitest tests and coverage

The debug API is returned from game initialization and available only through
`engine.debug`. Poses run through `engine.apply`; snapshots read the current
state. Tests use real engine frames, a counted clock, and a Node canvas.

The player-facing description, screenshots, and a four-second engine drawing
recording live in `showcase/`.
