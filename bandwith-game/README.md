# BandWith

A four-lane rhythm game built with React and a canvas renderer.

Hit each note as it lands on the line: `D` `F` `J` `K` on a keyboard, or tap the lanes on a touch screen. `Esc` pauses.

## Run

```sh
npm install
npm run dev     # play at http://localhost:5173
npm test        # scoring and timing checks
npm run build
```

## How it works

- `src/hooks/useGameEngine.js` holds the game: timing windows, score, combo, HP, and the audio. The `AudioContext` is the game clock, so pausing it pauses notes and sound together.
- `src/components/GameCanvas.jsx` draws lanes, notes and hit effects every frame.
- `src/assets/beatmaps/sample.json` is the chart: a list of `{ "time": ms, "lane": "d" | "f" | "j" | "k" }`.

Scoring: perfect within 50 ms (300), good within 100 ms (100), ok within 150 ms (50), plus 10% for every 10 combo. A miss costs 12 HP; a hit restores 3.
