(() => {
  const lamp = document.querySelector("#lamp-control");
  const lampLabel = lamp?.querySelector(".lamp-label") || null;
  const lanternHome = document.querySelector("#lantern-home");
  const lanternNote = document.querySelector(".lantern-note");
  const trailConsole = document.querySelector("#trail-console");
  const trailBackControl = document.querySelector("#trail-back-control");
  const trailNextControl = document.querySelector("#trail-next-control");
  const trailBackLabel = document.querySelector("#trail-back-label");
  const trailNextLabel = document.querySelector("#trail-next-label");
  const talkForm = document.querySelector("#talk-form");
  const talkInput = document.querySelector("#talk-input");
  const talkSend = document.querySelector("#talk-send");
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
    dozen: { name: "A dozen", next: null }
  };
  const apiUrl = String(window.EARTHLY_HANDS_API_URL || "").trim();
  const conversation = [];
  const defaultSceneState = {
    night: { ten: "listening in the dark", ground: "You are awake inside the guarded camp.", presence: "" },
    morning: { ten: "looking around", ground: "You are standing in the camp at first light.", presence: "" },
    southeast: { ten: "following the account", ground: "You are moving with the account toward the next camp.", presence: "" },
    "blue-water": { ten: "at the creek", ground: "You are at the creek with Mayes and Criner in view.", presence: "" },
    dozen: { ten: "still at Blue Water", ground: "You are still beside the same creek.", presence: "" }
  };
  const sceneState = JSON.parse(JSON.stringify(defaultSceneState));

  const sourceFloor = {
    night: [
      "Dawson reports that a small guard was posted around camp after an alarm.",
      "Two unnamed men were sent back to watch the ford of the river on the back trail.",
      "The carried report does not say that they reached the ford or describe their return."
    ],
    morning: [
      "Dawson reports the party was unattacked through the night.",
      "The two unnamed men and the ford do not reappear before the account moves on.",
      "The account next carries the party southeast."
    ],
    southeast: [
      "Dawson carries the party southeast about fifteen miles.",
      "The source does not preserve the traveled line.",
      "The party encamps on a small branch of Blue Water."
    ],
    "blue-water": [
      "On this creek Dawson reports finding Mr. Mayes and Mr. Criner.",
      "He reports that they resided on James’ Fork of Poteau.",
      "He reports that they were trapping for beaver here; residence and encounter remain distinct."
    ],
    dozen: [
      "Dawson reports Mayes and Criner had caught but a dozen beaver.",
      "The source does not divide that catch between them.",
      "Dawson says the weather was too cold to promise much further success."
    ]
  };

  function captureVisibleScene(id) {
    const scene = sceneById.get(id);
    if (!scene) return null;
    return {
      setting: scene.querySelector(".scene-setting")?.textContent?.trim() || "",
      title: scene.querySelector("h2")?.textContent?.trim() || "",
      view: Array.from(scene.querySelectorAll(".view-body > p")).map((p) => p.textContent.trim()).join("\n\n"),
      footing: scene.querySelector(".ten-footing")?.textContent?.trim() || "",
      appearance: experienceShell?.dataset.presence || ""
    };
  }

  function parseSceneReply(raw) {
    const text = String(raw || "").trim()
      .replace(/^\`\`\`json\s*/i, "")
      .replace(/^\`\`\`\s*/i, "")
      .replace(/\s*\`\`\`$/, "");
    try {
      const value = JSON.parse(text);
      if (!value || typeof value !== "object") return null;
      return value;
    } catch (_) {
      return null;
    }
  }

  function applyScenePatch(id, patch) {
    const scene = sceneById.get(id);
    if (!scene || !patch) return false;

    const setting = typeof patch.setting === "string" ? patch.setting.trim() : "";
    const title = typeof patch.title === "string" ? patch.title.trim() : "";
    const view = typeof patch.view === "string" ? patch.view.trim() : "";
    const footing = typeof patch.footing === "string" ? patch.footing.trim() : "";
    const companion = typeof patch.companion === "string" ? patch.companion.trim() : "";
    const allowedAppearance = new Set(["", "fire"]);
    const appearance = allowedAppearance.has(patch.appearance) ? patch.appearance : "";

    if (setting) scene.querySelector(".scene-setting").textContent = setting;
    if (title) scene.querySelector("h2").textContent = title;

    if (view) {
      const body = scene.querySelector(".view-body");
      const paragraphs = view.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
      body.replaceChildren(...paragraphs.map((text) => {
        const p = document.createElement("p");
        p.textContent = text;
        return p;
      }));
    }

    if (footing) {
      const target = scene.querySelector(".ten-footing");
      if (target) target.textContent = footing;
    }

    if (companion) {
      const target = scene.querySelector(".companion-footing");
      if (target) target.textContent = companion;
    }

    if (experienceShell) experienceShell.dataset.presence = appearance;
    return Boolean(setting || title || view || footing || companion || appearance);
  }

  try {
    const rememberedState = JSON.parse(window.localStorage.getItem("earthly-hands-dawson-state-v3") || "null");
    if (rememberedState && typeof rememberedState === "object") {
      for (const id of Object.keys(sceneState)) {
        if (rememberedState[id] && typeof rememberedState[id] === "object") {
          sceneState[id] = { ...sceneState[id], ...rememberedState[id] };
        }
      }
    }
  } catch (_) {
    // Present-state memory is optional.
  }
  let currentId = "morning";
  let asking = false;
  let touchStartX = null;
  let touchStartY = null;

  function setLamp(isLit) {
    document.body.dataset.lamp = "lit";
    if (lamp) lamp.setAttribute("aria-pressed", "true");
    if (lampLabel) lampLabel.textContent = "Dawson passage";
    if (lanternNote) lanternNote.hidden = true;
    if (trailConsole) trailConsole.hidden = false;
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

  function saveSceneState() {
    try {
      window.localStorage.setItem("earthly-hands-dawson-state-v3", JSON.stringify(sceneState));
    } catch (_) {
      // The lived layer still works without storage.
    }
  }

  function renderSceneState(id) {
    const state = sceneState[id] || defaultSceneState[id];
    const scene = sceneById.get(id);
    if (!state || !scene) return;

    const livedLine = scene.querySelector(".lived-line");
    if (livedLine) livedLine.textContent = state.ground;

    const tenFooting = scene.querySelector(".ten-footing");
    if (tenFooting) {
      const place = scene.dataset.place || "Dawson trail";
      tenFooting.textContent = `Ten · ${place} · ${state.ten}`;
    }

    if (experienceShell) experienceShell.dataset.presence = state.presence || "";
  }

  function shortState(text, limit = 118) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return "";
    const sentence = clean.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || clean;
    return sentence.length <= limit ? sentence : sentence.slice(0, limit - 1).trimEnd() + "…";
  }

  function receiveTenAction(message) {
    const clean = String(message || "").trim();
    const lower = clean.toLowerCase();
    const state = sceneState[currentId];
    if (!state) return;

    state.presence = "";
    if (/\b(fire|campfire|kindling|wood)\b/.test(lower)) {
      state.ten = "tending a small fire";
      state.ground = currentId === "night" ? "A small fire burns inside the guarded camp." : "A small fire burns beside you.";
      state.presence = "fire";
    } else if (/\b(coffee|cup|mug)\b/.test(lower)) {
      state.ten = "coffee in hand";
      state.ground = "You have a cup of coffee in hand. The ground has not moved.";
    } else if (/\b(beaver|trap|trapping|trapper)\b/.test(lower)) {
      if (currentId === "blue-water" || currentId === "dozen") {
        state.ten = "asking Mayes and Criner about beaver";
        state.ground = "You have turned the conversation toward beaver and trapping.";
      } else {
        state.ten = "asking about beaver trapping";
        state.ground = "You are asking about beaver trapping from here.";
      }
    } else if (/\b(wait|sit|stay|rest)\b/.test(lower)) {
      state.ten = "staying put";
      state.ground = defaultSceneState[currentId].ground;
    } else if (/\b(look|watch|listen|notice)\b/.test(lower)) {
      state.ten = "looking around";
      state.ground = defaultSceneState[currentId].ground;
    } else {
      state.ten = "asking the ground";
      state.ground = defaultSceneState[currentId].ground;
    }
    saveSceneState();
    renderSceneState(currentId);
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

  function updatePlace() {
    // The scene names its own place. Do not echo that label elsewhere in the interface.
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
    renderSceneState(target.id);
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

  function setAsking(value) {
    asking = value;
    talkInput.disabled = value;
    if (talkSend) talkSend.disabled = value;
    talkInput.placeholder = value ? "Listening…" : "Ask the ground";
  }

  async function askGround(message) {
    const clean = String(message || "").trim().slice(0, 240);
    if (!clean || asking) return;

    receiveTenAction(clean);
    talkInput.value = "";
    setAsking(true);

    if (!apiUrl) {
      setAsking(false);
      return;
    }

    const visible = captureVisibleScene(currentId);
    const facts = sourceFloor[currentId] || [];

    const sceneRequest = [
      "You are Small Door present remotely with Ten inside the Earthly Hands Dawson Trail experiment.",
      "VOICE: plain, testimonial, unresolved. Prefer exact nouns and earned verbs. Do not perform significance.",
      "FIRST PERSON VIEW: the bracketed view is ordinary prose from Ten's landed eyes. Write the amount that is useful. It may be one paragraph or several. No interface explanation.",
      "Historical source facts are a floor. Do not contradict them, turn an open question into a fact, or claim Dawson recorded Ten's invented actions.",
      "Ten may alter the present experiential layer: make a small fire, drink coffee, sit, ask questions, talk, notice things, or imagine a reversible present action. Keep that distinct from the 1831 source.",
      "Remain at the current ground unless Ten explicitly asks to move.",
      "Return ONLY valid JSON, no markdown, with exactly these keys:",
      '{"setting":"ground/carrier line","title":"plain headline","view":"natural prose; use blank lines between paragraphs when helpful","footing":"Ten footing in whatever length is useful","companion":"Small Door footing if useful","appearance":""}',
      'appearance may be only "" or "fire".',
      "There is no paragraph count, line count, or word-count requirement. Let the prose breathe. Keep the page coherent and useful after Ten's action.",
      `CURRENT GROUND: ${currentId}`,
      `SOURCE FLOOR: ${JSON.stringify(facts)}`,
      `CURRENT SCREEN: ${JSON.stringify(visible)}`,
      `TEN: ${clean}`
    ].join("\n");

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: sceneRequest,
          place: currentId,
          history: conversation.slice(-6),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.reply !== "string") {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const patch = parseSceneReply(data.reply);
      if (patch) {
        applyScenePatch(currentId, patch);
      } else {
        const reply = shortState(data.reply);
        if (reply && sceneState[currentId]) {
          sceneState[currentId].ground = reply;
          saveSceneState();
          renderSceneState(currentId);
        }
      }

      conversation.push({ role: "user", content: clean }, { role: "assistant", content: data.reply.trim() });
      if (conversation.length > 12) conversation.splice(0, conversation.length - 12);
    } catch (_) {
      // The local action already landed. The historical ground remains in place.
    } finally {
      setAsking(false);
    }
  }

  if (trailBackControl) {
    trailBackControl.addEventListener("click", () => {
      const target = trailBackControl.dataset.go;
      if (target) landAt(target);
    });
  }

  trailConsole?.addEventListener("click", (event) => {
    const button = event.target.closest(".trail-control");
    if (!button || button.disabled) return;
    const target = button.dataset.go;
    if (target && target !== currentId) landAt(target);
  });

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

  if (experienceStage) {
    experienceStage.addEventListener("touchstart", (event) => {
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });

    experienceStage.addEventListener("touchend", (event) => {
      if (touchStartX === null || touchStartY === null) return;
      const touch = event.changedTouches?.[0];
      if (!touch) return;

      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      touchStartX = null;
      touchStartY = null;

      if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) * 1.15) return;

      const index = fullSequence.indexOf(currentId);
      if (dx < 0 && index >= 0 && index < fullSequence.length - 1) {
        landAt(fullSequence[index + 1]);
      } else if (dx > 0 && index > 0) {
        landAt(fullSequence[index - 1]);
      }
    }, { passive: true });
  }

  window.addEventListener("popstate", () => {
    const id = window.location.hash.slice(1);
    const target = sceneById.get(id);
    if (!target || !fullSequence.includes(id)) return;

    const fromIndex = fullSequence.indexOf(currentId);
    const toIndex = fullSequence.indexOf(id);
    const direction = toIndex < fromIndex ? "back" : "forward";
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
