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
  followPanel: document.querySelector("#follow-panel"),
  followButton: document.querySelector("#follow-button"),
  continuation: document.querySelector("#continuation"),
  continuationTitle: document.querySelector("#continuation-title"),
  continuationLocator: document.querySelector("#continuation-locator"),
  continuationGap: document.querySelector("#continuation-gap"),
  continuationTurns: document.querySelector("#continuation-turns"),
  continuationState: document.querySelector("#continuation-state"),
  continuationUnfold: document.querySelector("#continuation-unfold"),
  continuationClose: document.querySelector("#continuation-close"),
  continuationReturn: document.querySelector("#continuation-return"),
  continuationNote: document.querySelector("#continuation-note"),
  continuationSourceLabel: document.querySelector("#continuation-source-label"),
  continuationSource: document.querySelector("#continuation-source"),
  continuationJacket: document.querySelector("#continuation-jacket"),
  sourceFace: document.querySelector("#source-face"),
  sourceJacket: document.querySelector("#source-jacket"),
  error: document.querySelector("#error")
};

let record = null;
let step = 0;
let ticketEmitted = false;
let continuationStep = 0;

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
    ui.note.textContent = "The bounded recognition sequence is complete. The examination carrier continues beyond it; no later source-local sequence or later carrier appears automatically.";
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
  ui.followPanel.hidden = !record.follow_forward_sequence;
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

function closeContinuation() {
  continuationStep = 0;
  ui.continuation.hidden = true;
  ui.followButton.disabled = false;
  ui.followButton.textContent = "follow later in this examination";
}

function closeNewest() {
  if (step === 0) return;
  step -= 1;
  if (ticketEmitted) {
    ticketEmitted = false;
    ui.ticketPanel.hidden = true;
    ui.followPanel.hidden = true;
    ui.ticketFields.innerHTML = "";
    ui.emit.textContent = "form descendant ticket";
    delete document.body.dataset.ticketReady;
    closeContinuation();
  }
  renderTurns();
}

function renderContinuation() {
  const sequence = record.follow_forward_sequence;
  const visibleStates = sequence.states.slice(0, continuationStep + 1);
  ui.continuationTurns.innerHTML = visibleStates.map(pairMarkup).join("");
  ui.continuationState.textContent = sequence.states[continuationStep].label;
  ui.continuationUnfold.disabled = continuationStep >= sequence.states.length - 1;
  ui.continuationClose.disabled = continuationStep === 0;

  if (continuationStep === 0) {
    ui.continuationUnfold.textContent = "unfold knowledge limit";
    ui.continuationNote.textContent = "The remembered conditional sentence is attributed speech. It is not Robert Bell’s direct testimony.";
  } else {
    ui.continuationNote.textContent = sequence.sequence_note;
  }
}

function openContinuation() {
  const sequence = record.follow_forward_sequence;
  if (!sequence) return;

  continuationStep = 0;
  ui.continuationTitle.textContent = sequence.object_label;
  ui.continuationLocator.textContent = sequence.source_locator;
  ui.continuationGap.textContent = sequence.gap_note;
  ui.continuationSourceLabel.textContent = sequence.source_face_label;
  ui.continuationSource.href = sequence.source_face_return;
  ui.continuationJacket.href = record.governing_jacket_return;
  ui.continuationSource.target = "_blank";
  ui.continuationJacket.target = "_blank";
  ui.continuationSource.rel = "noreferrer";
  ui.continuationJacket.rel = "noreferrer";
  renderContinuation();
  ui.continuation.hidden = false;
  ui.followButton.disabled = true;
  ui.followButton.textContent = "later sequence opened";
  ui.continuation.scrollIntoView({ behavior: "smooth", block: "start" });
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
    ui.followButton.addEventListener("click", openContinuation);
    ui.continuationUnfold.addEventListener("click", () => {
      const sequence = record.follow_forward_sequence;
      if (continuationStep >= sequence.states.length - 1) return;
      continuationStep += 1;
      renderContinuation();
      ui.continuationTurns.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    ui.continuationClose.addEventListener("click", () => {
      if (continuationStep === 0) return;
      continuationStep -= 1;
      renderContinuation();
    });
    ui.continuationReturn.addEventListener("click", () => {
      closeContinuation();
      ui.ticketPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });

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
