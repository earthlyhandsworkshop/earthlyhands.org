(() => {
  const lamp = document.querySelector("#lamp-control");
  const lampLabel = lamp.querySelector(".lamp-label");
  const lanternHome = document.querySelector("#lantern-home");
  const lanternNote = document.querySelector(".lantern-note");
  const where = document.querySelector("#where-label");
  const talk = document.querySelector("#ground-talk");
  const talkToggle = document.querySelector("#talk-toggle");
  const talkBody = document.querySelector("#talk-body");
  const talkPlace = document.querySelector("#ground-talk-place");
  const talkForm = document.querySelector("#talk-form");
  const talkInput = document.querySelector("#talk-input");
  const talkLog = document.querySelector("#talk-log");
  const talkSend = talkForm.querySelector("button[type='submit']");
  const main = document.querySelector("main");
  const experienceShell = document.querySelector("#experience-shell");
  const experienceStage = document.querySelector("#experience-stage");
  const thresholdIntro = document.querySelector("#threshold-intro");
  const experienceMount = document.querySelector("#experience-mount");
  const scenes = Array.from(document.querySelectorAll("[data-scene]"));
  const steps = Array.from(document.querySelectorAll("[data-step]"));
  const sequence = ["report", "night", "morning", "southeast", "blue-water", "dozen"];
  const fullSequence = ["threshold", ...sequence, "practice"];
  const apiUrl = String(window.EARTHLY_HANDS_API_URL || "").trim();
  const conversation = [];
  let currentId = "threshold";
  let asking = false;

  function setLamp(isLit) {
    document.body.dataset.lamp = isLit ? "lit" : "unlit";
    lamp.setAttribute("aria-pressed", String(isLit));
    lampLabel.textContent = isLit ? "Extinguish the lantern" : "Light the lantern";
    if (lanternNote) lanternNote.hidden = isLit;
    talk.hidden = !isLit;

    if (!isLit && lanternHome && !lanternHome.contains(lamp)) {
      lanternHome.prepend(lamp);
    }
  }

  function placeLanternWithActions(target) {
    if (document.body.dataset.lamp !== "lit") return;
    const actions = target?.querySelector(".passage-actions");
    if (actions && !actions.contains(lamp)) {
      actions.prepend(lamp);
    }
  }


  function updatePlace(target) {
    const place = target.dataset.place || "Workshop";
    where.textContent = place;
    talkPlace.textContent = place;
  }

  function showScene(target, direction = "forward") {
    const isThreshold = target.id === "threshold";

    if (!isThreshold && experienceMount && !experienceMount.contains(target)) {
      experienceMount.append(target);
    }

    if (experienceStage) experienceStage.dataset.direction = direction;
    scenes.forEach((scene) => scene.classList.toggle("is-current", scene === target));

    if (experienceMount) {
      experienceMount.hidden = false;
      experienceMount.setAttribute("aria-hidden", String(isThreshold));
    }
    if (thresholdIntro) thresholdIntro.setAttribute("aria-hidden", String(!isThreshold));

    updatePlace(target);
    if (!isThreshold) {
      placeLanternWithActions(target);
      target.focus({ preventScroll: true });
    }
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

  function landAt(id, { push = true } = {}) {
    const target = document.getElementById(id);
    if (!target || !fullSequence.includes(id)) return;

    const fromIndex = fullSequence.indexOf(currentId);
    const toIndex = fullSequence.indexOf(id);
    const direction = toIndex < fromIndex ? "back" : "forward";

    closeTalk();
    setLamp(id !== "threshold");
    currentId = id;
    remember(id);

    if (push) history.pushState({ place: id }, "", `#${id}`);
    requestAnimationFrame(() => showScene(target, direction));
  }

  function stepBack() {
    const index = fullSequence.indexOf(currentId);
    const previous = fullSequence[Math.max(0, index - 1)];
    landAt(previous);
  }

  function openTalk() {
    talk.dataset.open = "true";
    talkBody.hidden = false;
    talkToggle.setAttribute("aria-expanded", "true");
    talkToggle.textContent = "Close";
  }

  function closeTalk() {
    talk.dataset.open = "false";
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

    if (isLit) {
      setLamp(true);
      if (currentId === "threshold") {
        landAt("report");
      } else {
        const target = document.getElementById(currentId);
        if (target) showScene(target, "forward");
      }
      return;
    }

    setLamp(false);
    closeTalk();
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
    control.addEventListener("click", () => landAt(control.dataset.scroll));
  });

  document.querySelectorAll("[data-home]").forEach((control) => {
    control.addEventListener("click", (event) => {
      event.preventDefault();
      landAt("threshold");
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
    if (!target || !fullSequence.includes(id)) return;

    const fromIndex = fullSequence.indexOf(currentId);
    const toIndex = fullSequence.indexOf(id);
    const direction = toIndex < fromIndex ? "back" : "forward";

    closeTalk();
    setLamp(id !== "threshold");
    currentId = id;
    remember(id);
    showScene(target, direction);
  });

  let initialId = window.location.hash.slice(1);
  if (!fullSequence.includes(initialId)) {
    try {
      initialId = window.localStorage.getItem("earthly-hands-footing") || "threshold";
    } catch (_) {
      initialId = "threshold";
    }
  }

  if (!fullSequence.includes(initialId)) initialId = "threshold";
  currentId = initialId;
  setLamp(initialId !== "threshold");
  history.replaceState({ place: initialId }, "", `#${initialId}`);
  showScene(document.getElementById(initialId), "forward");

  steps.forEach((step) => step.setAttribute("aria-live", "polite"));
})();
