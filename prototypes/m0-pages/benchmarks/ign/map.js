const origin = "https://data.geopf.fr/wmts";
const center = [8.595, 42.136];
const route = [
  [8.5942, 42.1357],
  [8.5948, 42.1358],
  [8.5953, 42.1362],
  [8.5958, 42.1364],
];
const size = [512, 384];
const tileSize = 256;
const tiles = document.querySelector("#tiles");
const credit = document.querySelector("#credit");
const status = document.querySelector("#map-status");
const zoom = document.querySelector("#zoom");

let mode = "plan";
let request = 0;
let timeout;

function project([longitude, latitude], level) {
  const pixels = tileSize * 2 ** level;
  return [
    (longitude + 180) / 360 * pixels,
    (1 - Math.asinh(Math.tan(latitude * Math.PI / 180)) / Math.PI) / 2 * pixels,
  ];
}

function tileURL(level, column, row) {
  const query = new URLSearchParams({
    SERVICE: "WMTS", VERSION: "1.0.0", REQUEST: "GetTile",
    LAYER: "ORTHOIMAGERY.ORTHOPHOTOS", STYLE: "normal", FORMAT: "image/jpeg",
    TILEMATRIXSET: "PM_0_19", TILEMATRIX: level, TILEROW: row, TILECOL: column,
  });
  return origin + "?" + query;
}

function draw() {
  clearTimeout(timeout);
  const id = ++request;
  tiles.hidden = true;
  tiles.replaceChildren();
  credit.hidden = true;

  const level = Number(zoom.value);
  const [left, top] = project(center, level).map((value, index) => value - size[index] / 2);
  const points = route.map((point) => {
    const [x, y] = project(point, level);
    return [x - left, y - top];
  });
  for (const name of ["outline", "line"]) {
    document.getElementById(name).setAttribute("points", points.map((point) => point.join(",")).join(" "));
  }
  for (const [name, [x, y]] of [["start", points[0]], ["end", points.at(-1)]]) {
    document.getElementById(name).setAttribute("cx", x);
    document.getElementById(name).setAttribute("cy", y);
  }

  if (mode === "plan") {
    status.textContent = "Schéma affiché.";
    return;
  }

  status.textContent = "Chargement des photos aériennes…";
  const pending = [];
  for (let row = Math.floor(top / tileSize); row < Math.ceil((top + size[1]) / tileSize); row++) {
    for (let column = Math.floor(left / tileSize); column < Math.ceil((left + size[0]) / tileSize); column++) {
      const image = new Image();
      image.alt = "";
      image.className = "tile";
      image.style.left = (column * tileSize - left) / size[0] * 100 + "%";
      image.style.top = (row * tileSize - top) / size[1] * 100 + "%";
      image.src = tileURL(level, column, row);
      tiles.append(image);
      pending.push(image.decode());
    }
  }

  const useFallback = () => {
    if (id !== request) return;
    ++request;
    clearTimeout(timeout);
    mode = "plan";
    tiles.replaceChildren();
    status.textContent = "Photos aériennes indisponibles. Le schéma reste affiché.";
  };
  timeout = setTimeout(useFallback, 6_000);
  Promise.all(pending).then(() => {
    if (id !== request) return;
    clearTimeout(timeout);
    tiles.hidden = false;
    credit.hidden = false;
    status.textContent = "Photos aériennes IGN affichées.";
  }, useFallback);
}

document.querySelector("#ortho").addEventListener("click", () => {
  mode = "ortho";
  draw();
});
document.querySelector("#plan").addEventListener("click", () => {
  mode = "plan";
  draw();
});
zoom.addEventListener("change", draw);
draw();
