# Pixel Study Cozy

A cozy pixel-art room for a personal website. Real weather shows outside the window, the sky follows the real time of day, and there's an ambient sound mixer.

Built with **Phaser 3** (game engine) and **Vite** (dev server and build tool). The page around the game is plain HTML/CSS.

## Run it

```bash
npm install     # first time only
npm run dev     # then open http://localhost:5173
```

## What's in the room

| Thing | What it does |
|---|---|
| Window | Live weather (clear, cloudy, fog, rain, thunderstorm, snow) from [Open-Meteo](https://open-meteo.com) (free, no key) |
| Sky | Dawn, day, dusk and night, following the visitor's clock. City lights come on at night. |
| 🖥️ Monitor | Opens **Projects**. Its little chart is a teaser for a stock-trends page. |
| 📓 Notebook | Opens **About me** |
| 📌 Corkboard | Opens **Contact** |
| 💡 Lamp | Click to switch on and off |
| 🐱 Cat | Click for a sleepy "z" |
| 🕰️ Clock | Shows the real time |
| ☁️ Mood button | Override the weather or time of day |
| 🎧 Sound button | Mixer for rain, wind, fireplace, lo-fi keys and lo-fi beats (the beats stay in time with the keys). Rain and wind follow the weather until you move those sliders. |

## Make it yours

- **Your text:** edit the `panel-about`, `panel-projects` and `panel-contact` sections in `index.html`
- **Default city, starting volumes, cat's name:** `src/config.js`
- **Colors:** the `PALETTE` in `src/art.js`, plus CSS variables at the top of `src/style.css`
- **Room layout:** positions in `createFurniture()` in `src/scenes/RoomScene.js`

## Project layout

```
index.html               page + HTML panels (intro, mood, sound, about, projects, contact)
src/main.js              starts the game, wires up UI, weather and time
src/scenes/RoomScene.js  the room: sky, weather effects, furniture, lighting, clicks
src/art.js               placeholder pixel art, drawn in code
src/audio.js             ambient sound engine (Web Audio, all generated, no files)
src/weather.js           Open-Meteo request + weather code mapping
src/config.js            things you'll want to change
src/state.js             tiny shared state/event bus between the game and the page
```

## Upgrading the art

All art is drawn in code as placeholders, so the project runs with zero image files. To use real pixel art:

1. Put PNGs in `public/art/` (16×16 tilesets from itch.io work well; check the license).
2. Add a `preload()` method to `RoomScene` and load them with the same keys, e.g.
   `this.load.image('desk', 'art/desk.png');`
3. Delete the matching `tex(scene, 'desk', ...)` block in `src/art.js`.

For a full room layout, you can draw the map in the [Tiled](https://www.mapeditor.org/) editor, export it as JSON, and load it with `this.load.tilemapTiledJSON(...)`. That's how peteroravec.com builds its world.

## Upgrading the sounds

The sounds are generated live (noise and filters), which is good for a start. Real recordings sound richer:

1. Download loops from [freesound.org](https://freesound.org). Filter by the **Creative Commons 0** license so no credit is needed.
2. Put them in `public/sounds/` (e.g. `rain.mp3`).
3. In `src/audio.js`, replace the matching `build…()` function with one that plays the file through the same channel:

```js
async function buildRain() {
  const data = await fetch('sounds/rain.mp3').then((r) => r.arrayBuffer());
  loop(await ctx.decodeAudioData(data)).connect(channels.rain);
}
```

## Publish it

```bash
npm run build   # outputs a static site to dist/
```

Upload `dist/` to any static host: **Netlify** (drag and drop), **Vercel**, or **GitHub Pages**.

## Ideas for next steps

- A walking character, using arrow keys or a click to move
- A 50/10 focus timer that dims the room during focus
- A stock-trends page opened from the monitor, with daily data from a Python + `yfinance` script
- More rooms: a café, a train, a cabin
