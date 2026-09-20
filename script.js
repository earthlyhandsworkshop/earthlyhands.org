(() => {
  const lamp = document.querySelector("#lamp-control");
  const lampLabel = lamp.querySelector(".lamp-label");
  const where = document.querySelector("#where-label");
  const talk = document.querySelector("#ground-talk");
  const talkToggle = document.querySelector("#talk-toggle");
  const talkBody = document.querySelector("#talk-body");
  const talkPlace = document.querySelector("#ground-talk-place");
  const talkForm = document.querySelector("#talk-form");
  const talkInput = document.querySelector("#talk-input");
  const talkLog = document.querySelector("#talk-log");
  const talkSend = talkForm.querySelector("button[type='submit']");
  const steps = Array.from(document.querySelectorAll("[data-step]"));
  const sequence = ["report", "night", "morning", "southeast", "blue-water", "dozen"];
  const fullSequence = ["threshold", ...sequence];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const apiUrl = String(window.EARTHLY_HANDS_API_URL || "").trim();
  const conversation = [];
  let currentId = "threshold";
  let asking = false;

  function setLamp(isLit) {
    document.body.dataset.lamp = isLit ? "lit" : "unlit";
    lamp.setAttribute("aria-pressed", String(isLit));
    lampLabel.textContent = isLit ? "Extinguish the lantern" : "Light the lantern";
    talk.hidden = !isLit;
  }

  function updatePlace(target) {
    const place = target.dataset.place || "Workshop";
    where.textContent = place;
    talkPlace.textContent = place;
  }

  function moveTo(target) {
    updatePlace(target);
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  function remember(id) {
    try {
      window.localStorage.setItem("earthly-hands-footing", id);
    } catch (_) {
      // The passage still works when storage is unavailable.
    }
  }

  function forget() {
    try {
      window.localStorage.removeItem("earthly-hands-footing");
    } catch (_) {
      // Nothing else is required.
    }
  }

  function revealThrough(id) {
    const index = sequence.indexOf(id);
    if (index < 0) return false;
    sequence.slice(0, index + 1).forEach((stepId) => {
      document.getElementById(stepId)?.classList.add("is-revealed");
    });
    setLamp(true);
    return true;
  }

  function landAt(id, { push = true, move = true } = {}) {
    const target = document.getElementById(id);
    if (!target) return;

    closeTalk();
    if (id !== "threshold") revealThrough(id);
    currentId = id;
    remember(id);

    if (push) history.pushState({ place: id }, "", `#${id}`);
    if (move) requestAnimationFrame(() => moveTo(target));
    else updatePlace(target);
  }

  function stepBack() {
    const index = fullSequence.indexOf(currentId);
    const previous = fullSequence[Math.max(0, index - 1)];
    landAt(previous);
  }

  function openTalk() {
    talkBody.hidden = false;
    talkToggle.setAttribute("aria-expanded", "true");
    talkToggle.textContent = "Close";
  }

  function closeTalk() {
    talkBody.hidden = true;
    talkToggle.setAttribute("aria-expanded", "false");
    talkToggle.textContent = "Ask the ground";
  }

  function addTalkEntry(who, text) {
    const entry = document.createElement("div");
    entry.className = `talk-entry talk-entry-${who}`;

    const label = document.createElement("p");
    label.className = "talk-entry-who";
    label.textContent = who === "you" ? "You" : "Ground";

    const body = document.createElement("p");
    body.className = "talk-entry-text";
    body.textContent = text;

    entry.append(label, body);
    talkLog.append(entry);
    talkLog.scrollTop = talkLog.scrollHeight;
  }

  function setAsking(value) {
    asking = value;
    talkInput.disabled = value;
    talkSend.disabled = value;
    talkSend.textContent = value ? "Listening…" : "Send";
  }

  async function askGround(message) {
    const clean = String(message || "").trim().slice(0, 600);
    if (!clean || asking) return;

    openTalk();
    addTalkEntry("you", clean);
    talkInput.value = "";
    setAsking(true);

    if (!apiUrl) {
      addTalkEntry("ground", "The listening ground has not been connected yet. Your place has not moved.");
      setAsking(false);
      return;
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          place: currentId,
          history: conversation.slice(-6),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.reply !== "string") {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const reply = data.reply.trim();
      addTalkEntry("ground", reply);
      conversation.push({ role: "user", content: clean }, { role: "assistant", content: reply });
      if (conversation.length > 12) conversation.splice(0, conversation.length - 12);
    } catch (_) {
      addTalkEntry("ground", "The listening ground is unavailable. Your place has not moved.");
    } finally {
      setAsking(false);
      talkInput.focus();
    }
  }

  lamp.addEventListener("click", () => {
    const isLit = document.body.dataset.lamp !== "lit";
    setLamp(isLit);

    if (isLit) {
      if (!document.querySelector("#report").classList.contains("is-revealed")) {
        landAt("report");
      }
      return;
    }

    steps.forEach((step) => step.classList.remove("is-revealed"));
    closeTalk();
    talkLog.replaceChildren();
    conversation.length = 0;
    currentId = "threshold";
    forget();
    history.pushState({ place: "threshold" }, "", "#threshold");
    moveTo(document.querySelector("#threshold"));
  });

  document.querySelectorAll("[data-reveal]").forEach((control) => {
    control.addEventListener("click", () => landAt(control.dataset.reveal));
  });

  document.querySelectorAll("[data-back]").forEach((control) => {
    control.addEventListener("click", stepBack);
  });

  document.querySelectorAll("[data-prompt]").forEach((control) => {
    control.addEventListener("click", () => askGround(control.dataset.prompt));
  });

  document.querySelectorAll("[data-scroll]").forEach((control) => {
    control.addEventListener("click", () => {
      const target = document.getElementById(control.dataset.scroll);
      if (!target) return;
      history.pushState({ place: target.id }, "", `#${target.id}`);
      moveTo(target);
    });
  });

  talkToggle.addEventListener("click", () => {
    if (talkBody.hidden) {
      openTalk();
      talkInput.focus();
    } else {
      closeTalk();
    }
  });

  talkForm.addEventListener("submit", (event) => {
    event.preventDefault();
    askGround(talkInput.value);
  });

  talkInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      talkForm.requestSubmit();
    }
  });

  window.addEventListener("popstate", () => {
    const id = window.location.hash.slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    if (sequence.includes(id)) revealThrough(id);
    currentId = fullSequence.includes(id) ? id : currentId;
    moveTo(target);
  });

  let initialId = window.location.hash.slice(1);
  if (!fullSequence.includes(initialId) && initialId !== "practice") {
    try {
      initialId = window.localStorage.getItem("earthly-hands-footing") || "threshold";
    } catch (_) {
      initialId = "threshold";
    }
  }

  if (sequence.includes(initialId)) {
    revealThrough(initialId);
    currentId = initialId;
    updatePlace(document.getElementById(initialId));
  } else if (initialId === "practice") {
    setLamp(true);
    updatePlace(document.querySelector("#practice"));
  } else {
    updatePlace(document.querySelector("#threshold"));
  }

  steps.forEach((step) => step.setAttribute("aria-live", "polite"));
})();
