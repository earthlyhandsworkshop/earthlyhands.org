const DATA_URL = "./data/hugh-first-unfold.json";

const ui = {
  turns: document.querySelector("#turns"),
  stateLabel: document.querySelector("#state-label"),
  unfold: document.querySelector("#unfold"),
  close: document.querySelector("#close"),
  emit: document.querySelector("#emit"),
  note: document.querySelector("#control-note"),
  ticketPanel: document.querySelector("#ticket-panel"),
  ticketFields: document.querySelector("#ticket-fields"),
  sourceFace: document.querySelector("#source-face"),
  sourceJacket: document.querySelector("#source-jacket"),
  error: document.querySelector("#error")
};

let record = null;
let step = 0;
let ticketEmitted = false;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function turnMarkup(turn) {
  return `
    <div class="turn ${escapeHtml(turn.role)}" data-turn-id="${escapeHtml(turn.turn_id)}">
      <div class="turn-meta">
        <span>${escapeHtml(turn.voice)}</span>
        <span>${escapeHtml(turn.knowledge_or_action_state)}</span>
      </div>
      <blockquote>${escapeHtml(turn.exact_text)}</blockquote>
    </div>`;
}

function pairMarkup(state) {
  return `
    <section class="pair" data-interface-state="${escapeHtml(state.id)}">
      <div class="pair-label">
        ${escapeHtml(state.id)}
        <strong>${escapeHtml(state.label)}</strong>
      </div>
      <div class="pair-body">
        ${state.turns.map(turnMarkup).join("")}
      </div>
    </section>`;
}

function renderTurns() {
  const visibleStates = record.states.slice(0, step + 1);
  ui.turns.innerHTML = visibleStates.map(pairMarkup).join("");
  ui.stateLabel.textContent = record.states[step].label;

  ui.unfold.disabled = step >= record.states.length - 1;
  ui.close.disabled = step === 0;
  ui.emit.disabled = step < record.states.length - 1 || ticketEmitted;

  if (step === 0) {
    ui.unfold.textContent = "unfold next pair";
    ui.note.textContent = "One activation reveals one question-and-answer pair. Nothing already visible will disappear.";
  } else if (step === 1) {
    ui.unfold.textContent = "unfold knowledge test";
    ui.note.textContent = "The examiner’s supplied wording and Hugh’s tentative answer remain separate. The knowledge test is still closed.";
  } else {
    ui.note.textContent = "The source-local unit is complete. A descendant ticket may now be formed, but no later carrier appears automatically.";
  }
}

function renderTicket(ticket) {
  const orderedFields = ["actor", "object", "state", "verb", "claim", "change", "source", "allows", "forbids"];
  ui.ticketFields.innerHTML = orderedFields.map(key => {
    const value = ticket[key];
    const body = Array.isArray(value)
      ? `<ul>${value.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : escapeHtml(value);
    return `<dl class="ticket-field"><dt>${escapeHtml(key)}</dt><dd>${body}</dd></dl>`;
  }).join("");
  ui.ticketPanel.hidden = false;
}

function emitTicket() {
  if (step < record.states.length - 1 || ticketEmitted) return;

  ticketEmitted = true;
  const ticket = {
    occurrence_id: record.occurrence_id,
    carrier_id: record.carrier_id,
    representation_id: record.representation_id,
    source_face_return: record.source_face_return,
    governing_jacket_return: record.governing_jacket_return,
    ...record.emitted_ticket
  };

  renderTicket(ticket);
  ui.emit.disabled = true;
  ui.emit.textContent = "ticket formed";
  document.body.dataset.ticketReady = "true";
  window.dispatchEvent(new CustomEvent("earthlyhands:examination-ticket", { detail: ticket }));
  ui.ticketPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeNewest() {
  if (step === 0) return;
  step -= 1;
  if (ticketEmitted) {
    ticketEmitted = false;
    ui.ticketPanel.hidden = true;
    ui.ticketFields.innerHTML = "";
    ui.emit.textContent = "form descendant ticket";
    delete document.body.dataset.ticketReady;
  }
  renderTurns();
}

async function start() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load examination data (${response.status})`);
    record = await response.json();

    ui.sourceFace.href = record.source_face_return;
    ui.sourceJacket.href = record.governing_jacket_return;
    ui.sourceFace.target = "_blank";
    ui.sourceJacket.target = "_blank";
    ui.sourceFace.rel = "noreferrer";
    ui.sourceJacket.rel = "noreferrer";

    ui.unfold.addEventListener("click", () => {
      if (step >= record.states.length - 1) return;
      step += 1;
      renderTurns();
      ui.turns.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    ui.close.addEventListener("click", closeNewest);
    ui.emit.addEventListener("click", emitTicket);

    renderTurns();
  } catch (error) {
    console.error(error);
    ui.error.hidden = false;
    ui.unfold.disabled = true;
    ui.close.disabled = true;
    ui.emit.disabled = true;
  }
}

start();
