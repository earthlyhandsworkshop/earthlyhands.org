(() => {
  const lamp = document.querySelector("#lamp-control");
  const lampLabel = lamp?.querySelector(".lamp-label") || null;
  const lanternHome = document.querySelector("#lantern-home");
  const lanternNote = document.querySelector(".lantern-note");
  const talkForm = document.querySelector("#talk-form");
  const talkInput = document.querySelector("#talk-input");
  const talkSend = document.querySelector("#talk-send");
  const groundThread = document.querySelector("#ground-thread");
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
  const dawsonIndex = document.querySelector("#dawson-index");
  const campPeople = document.querySelector("#camp-people");
  const campPeopleList = document.querySelector(".camp-people-list");
  const dawsonStopList = document.querySelector(".dawson-stop-list");
  const viewModes = Array.from(document.querySelectorAll("[data-dawson-view]"));
  const scenes = Array.from(document.querySelectorAll("[data-scene]"));
  const steps = Array.from(document.querySelectorAll("[data-step]"));
  const sequence = ["night", "morning", "southeast", "blue-water", "dozen"];
  const fullSequence = [...sequence];
  const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
  const trailUi = {
    night: { name: "Night camp", note: "guard / ford / two unnamed men", next: "morning" },
    morning: { name: "Morning camp", note: "unattacked / unresolved return", next: "southeast" },
    southeast: { name: "Southeast reach", note: "about fifteen miles / route line unresolved", next: "blue-water" },
    "blue-water": { name: "Blue Water", note: "Mayes / Criner / trapping", next: "dozen" },
    dozen: { name: "A dozen", note: "catch quantity / cold weather", next: null }
  };
  const apiUrl = String(window.EARTHLY_HANDS_API_URL || "").trim();
  const conversation = [];
  let dawsonRetrieval = [];

  fetch("/data/dawson/retrieval.public.v0.json", { cache: "no-store" })
    .then((response) => response.ok ? response.json() : null)
    .then((payload) => {
      if (payload && Array.isArray(payload.entries)) dawsonRetrieval = payload.entries;
    })
    .catch(() => {
      // Corpus retrieval is additive; the held scene still works without it.
    });
  const defaultSceneState = {
    night: { ten: "listening in the dark", ground: "You are awake inside the guarded camp.", presence: "" },
    morning: { ten: "looking around", ground: "You are standing in the camp at first light.", presence: "" },
    southeast: { ten: "following the account", ground: "You are moving with the account toward the next camp.", presence: "" },
    "blue-water": { ten: "at the creek", ground: "You are at the creek with Mayes and Criner in view.", presence: "" },
    dozen: { ten: "still at Blue Water", ground: "You are still beside the same creek.", presence: "" }
  };
  const sceneState = JSON.parse(JSON.stringify(defaultSceneState));


  const peopleByGround = {
    night: [
      { name: "J. L. Dawson", relation: "report writer / narrator-side officer", note: "The report is his carrier; that does not make every person in the camp 'Dawson's' in identity." },
      { name: "Dawson's detachment", relation: "camp-side military body", note: "The individual men are not fully named in the held camp sequence." },
      { name: "five or six Choctaws", relation: "source-counted camp-side body", note: "Count and Choctaw label are source-carried; individual identities remain open here." },
      { name: "Pitman Calvert", relation: "arrived at camp that afternoon", note: "Arrival is source-controlled; later movement or overnight presence should not be assumed without the next source state." },
      { name: "See-ly", relation: "arrived with Calvert; source labels him 'a Chickasaw named See-ly'", note: "Keep the source name-form and label; no wider identity join is required here." },
      { name: "small guard", relation: "posted round camp during the night", note: "Unrostered body; do not merge automatically with the two men sent toward the ford." },
      { name: "two unnamed men", relation: "sent toward the ford on the back trail", note: "The source gives purpose to watch; it does not currently give arrival, completed watch, or return." }
    ],
    morning: [
      { name: "Dawson party", relation: "camp body in the morning state", note: "The report says the party was unattacked through the night." },
      { name: "two unnamed men", relation: "no longer mentioned in the carried morning passage", note: "Not repeated ≠ returned, lost, or absent." },
      { name: "small guard", relation: "night precaution no longer foregrounded", note: "Morning narration moves on without resolving every night-body." }
    ],
    southeast: [
      { name: "Dawson party", relation: "source-carried traveling body", note: "The route is stated southeast about fifteen miles; the traveled line itself remains unresolved." }
    ],
    "blue-water": [
      { name: "Mr. Mayes", relation: "found on this creek", note: "Dawson separately reports residence on James' Fork of Poteau." },
      { name: "Mr. Criner", relation: "found on this creek", note: "Dawson separately reports residence on James' Fork of Poteau." },
      { name: "Dawson party", relation: "encounter-side traveling body", note: "The source does not roster every individual at this encounter." }
    ],
    dozen: [
      { name: "Mr. Mayes", relation: "one of the two men said to have caught but a dozen beaver", note: "The source does not divide the catch between Mayes and Criner." },
      { name: "Mr. Criner", relation: "one of the two men said to have caught but a dozen beaver", note: "The source does not divide the catch between Mayes and Criner." },
      { name: "Dawson party", relation: "still in the Blue Water encounter sequence", note: "No new route is earned by the catch-quantity sentence itself." }
    ]
  };

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
      setting: scene.querySelector(".scene-place")?.textContent?.trim() || "",
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
    const moveTo = typeof patch.move_to === "string" ? patch.move_to.trim() : "";
    const allowedAppearance = new Set(["", "fire", "night", "fire-night"]);
    const appearance = allowedAppearance.has(patch.appearance) ? patch.appearance : "";

    if (setting) {
      const target = scene.querySelector(".scene-place");
      if (target) target.textContent = setting;
    }
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
    return { changed: Boolean(setting || title || view || footing || companion || appearance), moveTo };
  }

  try {
    const rememberedState = JSON.parse(window.localStorage.getItem("earthly-hands-dawson-state-v4") || "null");
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

  function setLamp(isLit) {
    document.body.dataset.lamp = "lit";
    if (lamp) lamp.setAttribute("aria-pressed", "true");
    if (lampLabel) lampLabel.textContent = "Exploring party";
    if (lanternNote) lanternNote.hidden = true;
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
      window.localStorage.setItem("earthly-hands-dawson-state-v4", JSON.stringify(sceneState));
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

  function proseReplyToPatch(raw, question) {
    const text = String(raw || "").trim();
    if (!text) return null;

    const paragraphs = text
      .replace(/^```(?:text|markdown)?\s*/i, "")
      .replace(/\s*```$/, "")
      .split(/\n\s*\n/)
      .map((x) => x.replace(/^#+\s*/, "").trim())
      .filter(Boolean);

    if (!paragraphs.length) return null;

    const q = String(question || "").toLowerCase();
    let title = "";
    if (/\bbeaver\b/.test(q)) title = "What the beaver were for.";
    else if (/\btrap|trapping|trapper\b/.test(q)) title = "What trapping meant here.";
    else if (/\bwater|creek|river\b/.test(q)) title = "The water around this ground.";
    else title = shortState(question, 64).replace(/[?.!]+$/, "");

    return {
      title,
      view: paragraphs.join("\n\n"),
      footing: `Ten · ${sceneById.get(currentId)?.dataset.place || "Shared Country"} · asking the ground`,
      companion: "Small Door · Mapping Grounds · remote",
      appearance: experienceShell?.dataset.presence || "",
      move_to: ""
    };
  }

  function receiveTenAction(message) {
    const clean = String(message || "").trim();
    const lower = clean.toLowerCase();
    const state = sceneState[currentId];
    if (!state) return;

    state.presence = "";
    const asksForNight = /\b(dark|night|nightfall|sunset|dusk|stay until dark|wait until dark)\b/.test(lower);
    const asksForFire = /\b(fire|campfire|kindling|wood)\b/.test(lower);

    if (asksForNight && asksForFire) {
      state.ten = "staying until dark beside a small fire";
      state.ground = "Dark has settled over the ground. A small fire burns beside you.";
      state.presence = "fire-night";
    } else if (asksForNight) {
      state.ten = "staying until dark";
      state.ground = "Dark has settled over the ground.";
      state.presence = "night";
    } else if (asksForFire) {
      state.ten = "tending a small fire";
      state.ground = currentId === "night" ? "A small fire burns inside the guarded camp." : "A small fire burns beside you.";
      state.presence = "fire";
    } else if (/\b(coffee|cup|mug)\b/.test(lower)) {
      state.ten = "coffee in hand";
      state.ground = "You have a cup of coffee in hand. The ground has not moved.";
    } else if (/\b(beaver|trap|trapping|trapper)\b/.test(lower)) {
      state.ten = "asking the ground";
      state.ground = defaultSceneState[currentId].ground;
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

  const allowedMoves = {
    night: ["morning"],
    morning: ["night", "southeast"],
    southeast: ["morning", "blue-water"],
    "blue-water": ["southeast", "dozen"],
    dozen: ["blue-water"]
  };

  function canMove(from, to) {
    return Boolean(to && allowedMoves[from]?.includes(to));
  }

  function corpusHitsFor(message, sceneId) {
    const words = String(message || "").toLowerCase();
    if (!words || !dawsonRetrieval.length) return [];

    return dawsonRetrieval
      .filter((entry) => Array.isArray(entry.scenes) && entry.scenes.includes(sceneId))
      .map((entry) => {
        const keywords = Array.isArray(entry.keywords) ? entry.keywords : [];
        const score = keywords.reduce((n, keyword) => n + (words.includes(String(keyword).toLowerCase()) ? 1 : 0), 0);
        return { entry, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ entry }) => ({
        id: entry.id,
        summary: entry.summary,
        brakes: entry.brakes,
        source_object_ids: entry.source_object_ids
      }));
  }

  function localMoveFromWords(message) {
    const lower = String(message || "").toLowerCase();

    const forward = /\b(go|walk|head|move|continue|follow|travel|leave|carry on|move on)\b/.test(lower);
    const backward = /\b(go back|walk back|head back|move back|return|backtrack)\b/.test(lower);

    if (currentId === "night" && /\b(wait until morning|stay until morning|sleep until morning|first light|daylight)\b/.test(lower)) return "morning";
    if (currentId === "morning" && forward && /\b(southeast|trail|onward|ahead)\b/.test(lower)) return "southeast";
    if (currentId === "southeast" && forward && /\b(blue water|creek|camp|onward|ahead)\b/.test(lower)) return "blue-water";
    if (currentId === "blue-water" && forward && /\b(next|onward|ahead|what happened next)\b/.test(lower)) return "dozen";

    if (currentId === "morning" && backward) return "night";
    if (currentId === "southeast" && backward) return "morning";
    if (currentId === "blue-water" && backward) return "southeast";
    if (currentId === "dozen" && backward) return "blue-water";

    return null;
  }

  function setDawsonView(view) {
    const next = ["ground", "talk", "index", "people"].includes(view) ? view : "ground";
    if (experienceShell) experienceShell.dataset.view = next;

    viewModes.forEach((button) => {
      const active = button.dataset.dawsonView === next;
      button.classList.toggle("is-current", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (experienceMount) experienceMount.hidden = next === "index" || next === "people";
    if (dawsonIndex) dawsonIndex.hidden = next !== "index";
    if (campPeople) campPeople.hidden = next !== "people";

    if (next === "talk") {
      requestAnimationFrame(() => talkInput?.focus({ preventScroll: true }));
    }
  }

  function buildDawsonIndex() {
    if (!dawsonStopList) return;
    const fragment = document.createDocumentFragment();

    fullSequence.forEach((id, i) => {
      const ui = trailUi[id];
      const row = document.createElement("button");
      row.type = "button";
      row.className = "dawson-stop";
      row.dataset.stop = id;
      row.innerHTML = `
        <span class="stop-number">${String(i + 1).padStart(2, "0")}</span>
        <strong>${ui?.name || id}</strong>
        <span>${ui?.note || ""}</span>
        <b aria-hidden="true">→</b>
      `;
      row.addEventListener("click", () => {
        landAt(id);
        setDawsonView("ground");
      });
      fragment.append(row);
    });

    dawsonStopList.replaceChildren(fragment);
  }


  function buildCampPeople() {
    if (!campPeopleList) return;
    const people = peopleByGround[currentId] || [];
    const fragment = document.createDocumentFragment();

    people.forEach((person) => {
      const row = document.createElement("article");
      row.className = "camp-person";
      const name = document.createElement("h3");
      name.textContent = person.name;
      const relation = document.createElement("p");
      relation.className = "camp-person-relation";
      relation.textContent = person.relation;
      const note = document.createElement("p");
      note.className = "camp-person-note";
      note.textContent = person.note;
      row.append(name, relation, note);
      fragment.append(row);
    });

    campPeopleList.replaceChildren(fragment);
  }

  function asksForStops(message) {
    const lower = String(message || "").toLowerCase();
    return /\b(where (else )?can i go|what (other )?stops|what is open|what's open|show me (the )?stops|where all is open|index|places can i go|where can we go)\b/.test(lower);
  }

  function asksForPeople(message) {
    const lower = String(message || "").toLowerCase();
    return /\b(who is here|who's here|who is in (the )?camp|who's in (the )?camp|everyone in (the )?camp|people here|show me (the )?people)\b/.test(lower);
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
    buildCampPeople();
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

  function sizeTalkInput() {
    if (!talkInput) return;
    talkInput.style.height = "auto";
    talkInput.style.height = Math.min(talkInput.scrollHeight, 180) + "px";
  }

  function keepTenWords(message) {
    if (!groundThread) return;
    const p = document.createElement("p");
    p.className = "ten-utterance";
    p.textContent = message;
    groundThread.replaceChildren(p);
  }

  async function askGround(message) {
    const clean = String(message || "").trim().slice(0, 1000);
    if (!clean || asking) return;

    const origin = currentId;

    if (asksForStops(clean)) {
      keepTenWords(clean);
      talkInput.value = "";
      sizeTalkInput();
      setDawsonView("index");
      return;
    }

    if (asksForPeople(clean)) {
      keepTenWords(clean);
      talkInput.value = "";
      sizeTalkInput();
      buildCampPeople();
      setDawsonView("people");
      return;
    }

    receiveTenAction(clean);
    const localMove = localMoveFromWords(clean);
    const movementResolved = Boolean(localMove && canMove(origin, localMove));
    keepTenWords(clean);
    talkInput.value = "";
    sizeTalkInput();
    setAsking(true);

    if (movementResolved) {
      landAt(localMove);
    }

    if (!apiUrl) {
      setAsking(false);
      return;
    }

    const visible = captureVisibleScene(currentId);
    const facts = sourceFloor[currentId] || [];
    const corpusHits = corpusHitsFor(clean, currentId);

    const sceneRequest = [
      "DOOR: Shared Country / Exploring-party ground.",
      "LOCAL JOB: recompose only the present Dawson scene from the held local ground. Do not claim that a companion is physically or historically present in 1831.",
      "VOICE: plain, testimonial, unresolved. Prefer exact nouns and earned verbs. Do not perform significance.",
      "HELD CONTEXT ONLY: use SOURCE FLOOR, CURRENT SCREEN, recent runtime conversation, and TEN. If they do not answer a factual question, say the held ground does not answer it.",
      "EXPERIENCE LAYER: Ten may make reversible present actions such as a small fire, coffee, sitting, waiting, looking, or darkness. Keep those distinct from the 1831 source.",
      movementResolved
        ? "MOVEMENT: Ten already moved once because this utterance clearly earned that crossing. Do not move again."
        : "MOVEMENT: remain here unless Ten explicitly asks to move. Topic words such as beaver, creek, trapping, Mayes, Criner, water, or weather are not movement commands.",
      "RETURN JSON ONLY with exactly these keys:",
      '{"setting":"ground/carrier line","title":"plain headline","view":"natural prose; blank lines allowed","footing":"Ten footing","companion":"optional public-ground footing","appearance":"","move_to":""}',
      'appearance must be "", "fire", "night", or "fire-night". move_to must be "" unless Ten explicitly moves; if moving, use only an id listed in ALLOWED MOVES.',
      "Let the response change only what this turn earns. No change, refusal, or an unresolved edge is valid. Reconsider the title only when the page is genuinely doing something different.",
      `ALLOWED MOVES: ${JSON.stringify(movementResolved ? [] : (allowedMoves[currentId] || []))}`,
      `CURRENT GROUND: ${currentId}`,
      `SOURCE FLOOR: ${JSON.stringify(facts)}`,
      `DAWSON CORPUS HITS: ${JSON.stringify(corpusHits)}`,
      "CORPUS RULE: corpus hits are public derivatives with source-object pointers. Use them only when they answer Ten's question; preserve their brakes and do not treat a derivative as a new historical witness.",
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
          // The current screen already carries the last model-shaped scene.
          // Keep only Ten's recent questions as runtime continuity so we do
          // not pay to resend the same rendered answer twice.
          history: conversation
            .filter((item) => item.role === "user")
            .slice(-2),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (data.usage) {
        console.info("Earthly Hands Worker usage", {
          request_id: data.request_id || "",
          ...data.usage,
        });
      }

      if (!response.ok || typeof data.reply !== "string") {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const patch = parseSceneReply(data.reply);
      if (patch) {
        const patchOrigin = currentId;
        const result = applyScenePatch(patchOrigin, patch);
        if (!movementResolved && result.moveTo && canMove(patchOrigin, result.moveTo)) {
          landAt(result.moveTo);
        }
      } else {
        const prosePatch = proseReplyToPatch(data.reply, clean);
        if (prosePatch) {
          applyScenePatch(currentId, prosePatch);
        }
      }

      conversation.push({ role: "user", content: clean });
      if (conversation.length > 4) conversation.splice(0, conversation.length - 4);
    } catch (error) {
      console.error("Shared Country listening error:", error);
      const scene = sceneById.get(currentId);
      const companion = scene?.querySelector(".companion-footing");
      if (companion) companion.textContent = "Small Door · listening ground did not answer";
      if (groundThread && !groundThread.querySelector(".listening-error")) {
        const note = document.createElement("p");
        note.className = "listening-error";
        note.textContent = "The listening ground did not answer this turn.";
        groundThread.append(note);
      }
    } finally {
      setAsking(false);
    }
  }

  viewModes.forEach((control) => {
    control.addEventListener("click", () => setDawsonView(control.dataset.dawsonView));
  });

  buildDawsonIndex();
  setDawsonView("ground");

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

  talkInput.addEventListener("input", sizeTalkInput);

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
