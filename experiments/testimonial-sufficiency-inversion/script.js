const DATA_URL = "./data/machine-three.json";

const ui = {
  layers: document.querySelector("#layers"),
  state: document.querySelector("#state-label"),
  openNext: document.querySelector("#open-next"),
  showNeighbors: document.querySelector("#show-neighbors"),
  testNegation: document.querySelector("#test-negation"),
  note: document.querySelector("#control-note"),
  neighbors: document.querySelector("#neighbors"),
  neighborList: document.querySelector("#neighbor-list"),
  refusal: document.querySelector("#refusal"),
  lowerReturn: document.querySelector("#lower-return"),
  error: document.querySelector("#error")
};

let record = null;
let step = 0;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
}

function layerMarkup(layer, index) {
  const body = layer.items
    ? `<ul>${layer.items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<p>${escapeHtml(layer.text)}</p>`;
  const quote = layer.quote ? `<blockquote>${escapeHtml(layer.quote)}</blockquote>` : "";
  return `
    <section class="layer" data-layer="${escapeHtml(layer.id)}">
      <div class="layer-mark"><span>door ${index + 1}</span>${escapeHtml(layer.label)}</div>
      <div class="layer-body">
        <h3>${escapeHtml(layer.title)}</h3>
        ${body}
        ${quote}
      </div>
    </section>`;
}

function renderLayers() {
  ui.layers.innerHTML = record.layers.slice(0, step).map(layerMarkup).join("");
  const complete = step >= record.layers.length;
  ui.state.textContent = complete ? "frame opened" : step === 0 ? "compact answer" : record.layers[step - 1].state;
  ui.openNext.disabled = complete;
  ui.showNeighbors.disabled = !complete;
  ui.testNegation.disabled = !complete;
  ui.lowerReturn.hidden = !complete;

  if (!complete) {
    ui.openNext.textContent = record.layers[step].button;
    ui.note.textContent = record.layers[step].prompt;
  } else {
    ui.openNext.textContent = "answer opened";
    ui.note.textContent = "Maker, selected input, administrative characterization, and applied frame are visible. Neighboring evidence remains unjoined.";
  }
}

function openNextLayer() {
  if (step >= record.layers.length) return;
  step += 1;
  renderLayers();
  ui.layers.lastElementChild?.scrollIntoView({behavior:"smooth",block:"center"});
}

function showNeighbors() {
  ui.neighborList.innerHTML = record.neighbors.map(item => `<li>${escapeHtml(item)}</li>`).join("");
  ui.neighbors.hidden = false;
  ui.showNeighbors.disabled = true;
  ui.showNeighbors.textContent = "neighboring evidence separated";
  ui.neighbors.scrollIntoView({behavior:"smooth",block:"start"});
}

function testNegation() {
  ui.refusal.hidden = false;
  ui.testNegation.disabled = true;
  ui.testNegation.textContent = "transition refused";
  ui.refusal.scrollIntoView({behavior:"smooth",block:"start"});
}

async function start() {
  try {
    const response = await fetch(DATA_URL,{cache:"no-store"});
    if (!response.ok) throw new Error(`Could not load machine data (${response.status})`);
    record = await response.json();
    ui.openNext.addEventListener("click",openNextLayer);
    ui.showNeighbors.addEventListener("click",showNeighbors);
    ui.testNegation.addEventListener("click",testNegation);
    renderLayers();
  } catch (error) {
    console.error(error);
    ui.error.hidden = false;
    ui.openNext.disabled = true;
    ui.showNeighbors.disabled = true;
    ui.testNegation.disabled = true;
  }
}

start();
