(() => {
  const lamp = document.querySelector("#lamp-control");
  const lampLabel = lamp?.querySelector(".lamp-label") || null;
  const lanternHome = document.querySelector("#lantern-home");
  const lanternNote = document.querySelector(".lantern-note");
  const where = document.querySelector("#where-label");
  const footingPlace = document.querySelector("#footing-place");
  const trailConsole = document.querySelector("#trail-console");
  const trailBackControl = document.querySelector("#trail-back-control");
  const trailNextControl = document.querySelector("#trail-next-control");
  const trailBackLabel = document.querySelector("#trail-back-label");
  const trailNextLabel = document.querySelector("#trail-next-label");
  const talk = document.querySelector("#ground-talk");
  const talkToggle = document.querySelector("#talk-toggle");
  const talkBody = document.querySelector("#talk-body");
  const talkForm = document.querySelector("#talk-form");
  const talkInput = document.querySelector("#talk-input");
  const talkLog = document.querySelector("#talk-log");
  const talkSend = talkForm.querySelector("button[type='submit']");
  const depthData = {
    distance: {
      kind: "Prose Map relation",
      title: "about fifteen miles southeast",
      near: "The report gives an approximate distance and direction between source states.",
      brake: "It does not preserve the traveled line or earn an exact starting point, modern road, or reconstructed route."
    },
    creek: {
      kind: "Prose Map relation",
      title: "small branch of Blue Water",
      near: "The carried report places the next encampment on a small branch of Blue Water.",
      brake: "That does not earn an exact modern creek identity, bank, campsite point, or reconstructed route."
    },
    mayes: {
      kind: "Name Web occurrence",
      title: "Mr. Mayes",
      near: "Dawson reports finding Mayes here with Mr. Criner.",
      brake: "This occurrence does not silently join another Mayes or turn into a biography."
    },
    criner: {
      kind: "Name Web occurrence",
      title: "Mr. Criner",
      near: "Dawson reports finding Criner here with Mr. Mayes.",
      brake: "This occurrence does not silently join another Criner or turn into a biography."
    },
    residence: {
      kind: "Prose Map relation",
      title: "reside on James’ Fork of Poteau",
      near: "The report carries a residence relation from Mayes and Criner to James’ Fork of Poteau.",
      brake: "Residence does not relocate the Blue Water encounter or earn a house point, parcel, or route between the two."
    },
    trapping: {
      kind: "Source relation",
      title: "trapping for beaver here",
      near: "The report attaches this activity to the Blue Water encounter state.",
      brake: "It does not make the trapping place and the residence place one location."
    }
  };
  let openDepth = null;
  const main = document.querySelector("main");
  const experienceShell = document.querySelector("#experience-shell");
  const experienceStage = document.querySelector("#experience-stage");
  const thresholdIntro = document.querySelector("#threshold-intro");
  const experienceMount = document.querySelector("#experience-mount");
  const scenes = Array.from(document.querySelectorAll("[data-scene]"));
  const steps = Array.from(document.querySelectorAll("[data-step]"));
  const sequence = ["night", "morning", "southeast", "blue-water", "dozen"];
  const fullSequence = [...sequence];
  const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
  const trailUi = {
    night: { name: "Night camp", next: "morning" },
    morning: { name: "Morning camp", next: "southeast" },
    southeast: { name: "Southeast reach", next: "blue-water" },
    "blue-water": { name: "Blue Water", next: "dozen" },
    dozen: { name: "The catch", next: null }
  };
  const apiUrl = String(window.EARTHLY_HANDS_API_URL || "").trim();
  const conversation = [];
  let currentId = "morning";
  let asking = false;

  function setLamp(isLit) {
    document.body.dataset.lamp = "lit";
    if (lamp) lamp.setAttribute("aria-pressed", "true");
    if (lampLabel) lampLabel.textContent = "Dawson passage";
    if (lanternNote) lanternNote.hidden = true;
    if (trailConsole) trailConsole.hidden = false;
    talk.hidden = false;
  }

  function setGround(id) {
    document.body.dataset.ground = id;
    const theme = document.querySelector('meta[name="theme-color"]');
    if (!theme) return;
    const colors = {
      threshold: "#e7dfd0",
      report: "#2a2720",
      night: "#12171c",
      morning: "#eee2c8",
      southeast: "#e4dcc3",
      "blue-water": "#d9dfdb",
      dozen: "#e8dcc0"
    };
    theme.setAttribute("content", colors[id] || colors.threshold);
  }

  function updateTrailConsole(id) {
    if (!trailConsole) return;
    const ui = trailUi[id];
    if (!ui) return;

    const previousIndex = fullSequence.indexOf(id) - 1;
    if (previousIndex >= 0) {
      const previousId = fullSequence[previousIndex];
      trailBackControl.disabled = false;
      trailBackControl.dataset.go = previousId;
      trailBackLabel.textContent = trailUi[previousId].name;
    } else {
      trailBackControl.disabled = true;
      trailBackControl.dataset.go = "";
      trailBackLabel.textContent = "";
    }

    if (ui.next) {
      trailNextControl.disabled = false;
      trailNextControl.dataset.go = ui.next;
      trailNextLabel.textContent = trailUi[ui.next].name;
    } else {
      trailNextControl.disabled = true;
      trailNextControl.dataset.go = "";
      trailNextLabel.textContent = "";
    }
  }

  function updatePlace(target) {
    const place = target.dataset.place || "Workshop";
    where.textContent = place;
    if (footingPlace) footingPlace.textContent = place;
  }

  function closeDepth() {
    if (!openDepth) return;
    openDepth.button.setAttribute("aria-expanded", "false");
    openDepth.panel.remove();
    openDepth = null;
  }

  function openDepthPanel(button) {
    const data = depthData[button.dataset.depth];
    if (!data) return;
    if (openDepth && openDepth.button === button) {
      closeDepth();
      return;
    }
    closeDepth();
    const panel = document.createElement("aside");
    panel.className = "depth-slip";
    panel.innerHTML = `
      <div class="depth-slip-head">
        <div><p class="depth-kind"></p><h3></h3></div>
        <button class="depth-close" type="button" aria-label="Close relation depth">×</button>
      </div>
      <p class="depth-near"></p>
      <p class="depth-brake"></p>
    `;
    panel.querySelector(".depth-kind").textContent = data.kind;
    panel.querySelector("h3").textContent = data.title;
    panel.querySelector(".depth-near").textContent = data.near;
    panel.querySelector(".depth-brake").textContent = data.brake;
    panel.querySelector(".depth-close").addEventListener("click", closeDepth);
    button.closest("p").insertAdjacentElement("afterend", panel);
    button.setAttribute("aria-expanded", "true");
    openDepth = { button, panel };
  }

  function showScene(target, direction = "forward") {
    closeDepth();
    setGround(target.id);
    updateTrailConsole(target.id);

    if (experienceStage) experienceStage.dataset.direction = direction;
    scenes.forEach((scene) => scene.classList.toggle("is-current", scene === target));

    if (experienceMount) {
      experienceMount.hidden = false;
      experienceMount.removeAttribute("aria-hidden");
      if (experienceMount.firstElementChild !== target || experienceMount.childElementCount !== 1) {
        experienceMount.replaceChildren(target);
      }
    }

    updatePlace(target);
    target.focus({ preventScroll: true });
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
    const target = sceneById.get(id);
    if (!target || !fullSequence.includes(id)) return;

    const fromIndex = fullSequence.indexOf(currentId);
    const toIndex = fullSequence.indexOf(id);
    const direction = toIndex < fromIndex ? "back" : "forward";

    closeTalk();
    setLamp(id !== "threshold");
    currentId = id;
    remember(id);

    if (push) {
      const url = `#${id}`;
      history.pushState({ place: id }, "", url);
    }
    requestAnimationFrame(() => showScene(target, direction));
  }

  function stepBack() {
    const index = fullSequence.indexOf(currentId);
    if (index <= 0) return;
    landAt(fullSequence[index - 1]);
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

  if (trailBackControl) {
    trailBackControl.addEventListener("click", () => {
      const target = trailBackControl.dataset.go;
      if (target) landAt(target);
    });
  }

  if (trailNextControl) {
    trailNextControl.addEventListener("click", () => {
      const target = trailNextControl.dataset.go;
      if (target) landAt(target);
    });
  }

  document.querySelectorAll("[data-depth]").forEach((control) => {
    control.addEventListener("click", () => openDepthPanel(control));
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
      window.scrollTo({ top: 0, behavior: "smooth" });
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
    const target = sceneById.get(id);
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
      initialId = window.localStorage.getItem("earthly-hands-footing") || "morning";
    } catch (_) {
      initialId = "night";
    }
  }

  if (!fullSequence.includes(initialId)) initialId = "morning";
  currentId = initialId;
  setLamp(true);
  history.replaceState({ place: initialId }, "", `#${initialId}`);
  showScene(sceneById.get(initialId), "forward");

  const specimenIndex = document.querySelector(".specimen-index");
  if (specimenIndex) {
    [...specimenIndex.children]
      .filter((node) => node.matches?.("[data-touched]"))
      .sort((a, b) => Date.parse(b.dataset.touched) - Date.parse(a.dataset.touched))
      .forEach((node) => specimenIndex.append(node));
  }

  steps.forEach((step) => step.setAttribute("aria-live", "polite"));
})();
