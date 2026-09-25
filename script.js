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
  const proseMapSvg = document.querySelector("#prose-map-svg");
  const campPeople = document.querySelector("#camp-people");
  const campPeopleList = document.querySelector(".camp-people-list");
  const campPeopleCount = document.querySelector("#camp-people-count");
  const campSources = document.querySelector("#camp-sources");
  const campSourceList = document.querySelector(".camp-source-list");
  const viewModes = Array.from(document.querySelectorAll("[data-dawson-view]"));
  const scenes = Array.from(document.querySelectorAll("[data-scene]"));
  const steps = Array.from(document.querySelectorAll("[data-step]"));
  const sequence = ["night", "morning", "southeast", "blue-water", "dozen", "guide", "blue-water-mouth", "east-blue-water"];
  const fullSequence = [...sequence];
  const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
  const trailUi = {
    night: { name: "Night camp", note: "guard / ford / two unnamed men", next: "morning" },
    morning: { name: "Morning camp", note: "unattacked / unresolved return", next: "southeast" },
    southeast: { name: "Southeast reach", note: "about fifteen miles / route line unresolved", next: "blue-water" },
    "blue-water": { name: "Blue Water", note: "Mayes / Criner / trapping", next: "dozen" },
    dozen: { name: "A dozen", note: "catch quantity / cold weather", next: "guide" },
    guide: { name: "Mayes joins", note: "guide role / Kiamiche accompaniment", next: "blue-water-mouth" },
    "blue-water-mouth": { name: "Near Blue Water mouth", note: "inspection intent / possible garrison", next: "east-blue-water" },
    "east-blue-water": { name: "East of Blue Water", note: "capacity / settlement forecast", next: null }
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
    dozen: { ten: "still at Blue Water", ground: "You are still beside the same creek.", presence: "" },
    guide: { ten: "watching roles change", ground: "You are still at Blue Water. Mayes is now carried as a guide.", presence: "" },
    "blue-water-mouth": { ten: "near the mouth", ground: "You are near the mouth of Blue Water at source-relative scale.", presence: "" },
    "east-blue-water": { ten: "inside a forecast", ground: "You are still inside Dawson's regional forecast east of Blue Water.", presence: "" }
  };
  const sceneState = JSON.parse(JSON.stringify(defaultSceneState));


  const peopleByGround = {
    night: [
      { name: "small guard", relation: "posted round camp during the night", note: "Unrostered body; do not merge automatically with the two men sent toward the ford." },
      { name: "two unnamed men", relation: "sent toward the ford on the back trail", note: "The source gives purpose to watch; it does not currently give arrival, completed watch, or return." }
    ],
    morning: [
      { name: "traveling party", relation: "narrator-carried camp body in the morning state", note: "The report says the party was unattacked through the night; this label is not a complete roster." },
      { name: "two unnamed men", relation: "no longer mentioned in the carried morning passage", note: "Not repeated ≠ returned, lost, or absent." },
      { name: "small guard", relation: "night precaution no longer foregrounded", note: "Morning narration moves on without resolving every night-body." }
    ],
    southeast: [
      { name: "traveling party", relation: "source-carried movement body", note: "The route is stated southeast about fifteen miles; the traveled line and complete roster remain unresolved." }
    ],
    "blue-water": [
      { name: "Mr. Mayes", relation: "found on this creek", note: "Dawson separately reports residence on James' Fork of Poteau." },
      { name: "Mr. Criner", relation: "found on this creek", note: "Dawson separately reports residence on James' Fork of Poteau." },
      { name: "traveling party", relation: "encounter-side body carried by the report", note: "The source does not roster every individual at this encounter." }
    ],
    dozen: [
      { name: "Mr. Mayes", relation: "one of the two men said to have caught but a dozen beaver", note: "The source does not divide the catch between Mayes and Criner." },
      { name: "Mr. Criner", relation: "one of the two men said to have caught but a dozen beaver", note: "The source does not divide the catch between Mayes and Criner." },
      { name: "traveling party", relation: "still in the Blue Water encounter sequence", note: "No new route or complete roster is earned by the catch-quantity sentence itself." }
    ],
    guide: [
      { name: "Mr. Mayes", relation: "employed as a guide", note: "The report earns the guide role here; terms, pay, and exact route remain open." },
      { name: "Mr. Criner", relation: "induced to accompany the delegation as far as Kiamiche", note: "The source does not make Criner a guide." },
      { name: "Col. George S. Gaines", relation: "named as one of the two men who induced Mayes and Criner to accompany", note: "This relation does not by itself establish every later movement or employer-of-record detail." },
      { name: "Col. Reynolds", relation: "named with Gaines in the inducement relation", note: "The source does not collapse Reynolds's role into Mayes's guide employment." },
      { name: "delegation", relation: "the moving body Mayes and Criner are induced to accompany", note: "The full roster remains a separate count and identity problem." }
    ],
    "blue-water-mouth": [
      { name: "J. L. Dawson", relation: "report writer making the inspection-intent and garrison-prospect statements", note: "Desire to inspect is not proof that he reached or surveyed either mouth in this sentence." },
      { name: "traveling party", relation: "carried as within a short distance of Blue Water's mouth", note: "The exact composition and point remain unresolved." }
    ],
    "east-blue-water": [
      { name: "J. L. Dawson", relation: "speaker of the capacity and settlement forecast", note: "The judgment is attributed to Dawson; it is not a demographic measurement or mapped boundary." },
      { name: "the Choctaw Nation", relation: "object of Dawson's capacity / future-settlement statement", note: "This does not establish actual residence, occupancy, ownership, or settlement east of Blue Water at that moment." }
    ]
  };

  const sourceFloor = {
    night: [
      "The held account reports that a small guard was posted around camp after an alarm.",
      "Two unnamed men were sent back to watch the ford of the river on the back trail.",
      "The held account does not say that they reached the ford or describe their return."
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
    ],
    guide: [
      "Dawson says Cols. Gaines and Reynolds induced Mayes and Criner to accompany the delegation as far as Kiamiche.",
      "He says Mr. Mayes was employed as a guide.",
      "This sentence does not establish the terms of employment, make Criner a guide, or prove arrival at Kiamiche."
    ],
    "blue-water-mouth": [
      "Dawson says the traveling body was within a short distance of the mouth of Blue Water.",
      "He says he desired to see the mouths of Blue Water and the Washita to report on their local advantages for a possible garrison.",
      "Inspection intent does not prove arrival, survey, site selection, executive decision, or construction."
    ],
    "east-blue-water": [
      "Dawson says there is ample room for the whole nation in the portion east of Blue Water.",
      "He predicts that this portion will fill with settlements first.",
      "This is Dawson's forecast and comparative judgment, not proof of existing settlement or surveyed regional boundaries."
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
    const rememberedState = JSON.parse(window.sessionStorage.getItem("earthly-hands-discovery-scene-v3") || "null");
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
  let currentId = "night";
  let furthestIndex = 0;
  let asking = false;
  let discoveryOpen = false;
  let thresholdThoughtGiven = false;

  try {
    discoveryOpen = window.localStorage.getItem("earthly-hands-discovery-open-v3") === "1";
    thresholdThoughtGiven = window.localStorage.getItem("earthly-hands-thought-given-v3") === "1";
  } catch (_) {
    discoveryOpen = false;
    thresholdThoughtGiven = false;
  }

  try {
    const rememberedReach = Number(window.localStorage.getItem("earthly-hands-story-reach-v3") || "0");
    if (Number.isFinite(rememberedReach)) furthestIndex = Math.max(0, Math.min(fullSequence.length - 1, rememberedReach));
  } catch (_) {
    // Visitor reach can remain session-local when durable browser storage is unavailable.
  }

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
      dozen: "#e8dcc0",
      guide: "#e8dcc0",
      "blue-water-mouth": "#d8dfdc",
      "east-blue-water": "#e1ddca"
    };
    theme.setAttribute("content", colors[id] || colors.threshold);
  }

  function saveSceneState() {
    try {
      window.sessionStorage.setItem("earthly-hands-discovery-scene-v3", JSON.stringify(sceneState));
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


  function continuityGround(id) {
    const base = String(defaultSceneState[id]?.ground || "").trim();
    if (!base) return "You are still on the same ground.";
    if (/\bstill\b/i.test(base)) return base;
    if (/^You are\b/.test(base)) return base.replace(/^You are\b/, "You are still");
    if (/^You have\b/.test(base)) return "You are still here. " + base;
    return "You are still on the same ground. " + base;
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
      state.ground = continuityGround(currentId);
    } else if (/\b(wait|sit|stay|rest)\b/.test(lower)) {
      state.ten = "staying put";
      state.ground = continuityGround(currentId);
    } else if (/\b(look|watch|listen|notice)\b/.test(lower)) {
      state.ten = "looking around";
      state.ground = continuityGround(currentId);
    } else {
      state.ten = "asking the ground";
      state.ground = continuityGround(currentId);
    }
    saveSceneState();
    renderSceneState(currentId);
  }

  const allowedMoves = {
    night: ["morning"],
    morning: ["night", "southeast"],
    southeast: ["morning", "blue-water"],
    "blue-water": ["southeast", "dozen"],
    dozen: ["blue-water", "guide"],
    guide: ["dozen", "blue-water-mouth"],
    "blue-water-mouth": ["guide", "east-blue-water"],
    "east-blue-water": ["blue-water-mouth"]
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
    if (currentId === "dozen" && forward && /\b(next|onward|ahead|guide|mayes|what happened next)\b/.test(lower)) return "guide";
    if (currentId === "guide" && forward && /\b(next|onward|ahead|mouth|blue water|what happened next)\b/.test(lower)) return "blue-water-mouth";
    if (currentId === "blue-water-mouth" && forward && /\b(next|onward|ahead|east|what happened next)\b/.test(lower)) return "east-blue-water";

    if (currentId === "morning" && backward) return "night";
    if (currentId === "southeast" && backward) return "morning";
    if (currentId === "blue-water" && backward) return "southeast";
    if (currentId === "dozen" && backward) return "blue-water";
    if (currentId === "guide" && backward) return "dozen";
    if (currentId === "blue-water-mouth" && backward) return "guide";
    if (currentId === "east-blue-water" && backward) return "blue-water-mouth";

    return null;
  }

  function encounteredPeopleCount() {
    const reachedIndex = Math.max(furthestIndex, fullSequence.indexOf(currentId));
    const names = new Set();
    fullSequence.slice(0, reachedIndex + 1).forEach((sceneId) => {
      (peopleByGround[sceneId] || []).forEach((person) => names.add(person.name));
    });
    return names.size;
  }

  function mapIsEarned() {
    // Camp + Blue Water are the first two distinct public place relations.
    return Math.max(furthestIndex, fullSequence.indexOf(currentId)) >= fullSequence.indexOf("blue-water");
  }

  function syncDiscoveryChrome() {
    const peopleButton = document.querySelector('[data-dawson-view="people"]');
    const mapButton = document.querySelector('[data-dawson-view="map"]');

    if (peopleButton) peopleButton.hidden = !discoveryOpen || encounteredPeopleCount() === 0;
    if (mapButton) mapButton.hidden = !discoveryOpen || !mapIsEarned();

    document.body.dataset.discovery = discoveryOpen ? "open" : "closed";
    document.body.dataset.thought = thresholdThoughtGiven ? "given" : "none";
  }

  function showThresholdThought(patch) {
    if (!groundThread) return;
    const raw = patch?.view || patch?.title || patch?.setting || "";
    const line = shortState(raw, 180) || "The ground does not answer that yet.";
    const p = document.createElement("p");
    p.className = "threshold-thought";
    p.textContent = line;
    groundThread.replaceChildren(p);
    thresholdThoughtGiven = true;
    document.body.dataset.thought = "given";
    try {
      window.localStorage.setItem("earthly-hands-thought-given-v3", "1");
    } catch (_) {}
  }

  function openDiscovery() {
    if (discoveryOpen) return;
    discoveryOpen = true;
    try {
      window.localStorage.setItem("earthly-hands-discovery-open-v3", "1");
    } catch (_) {}
    syncDiscoveryChrome();
  }

  function setDawsonView(view) {
    const next = ["ground", "map", "people", "sources"].includes(view) ? view : "ground";
    if (experienceShell) experienceShell.dataset.view = next;

    viewModes.forEach((button) => {
      const active = button.dataset.dawsonView === next;
      button.classList.toggle("is-current", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (experienceMount) experienceMount.hidden = next === "map" || next === "people" || next === "sources";
    if (dawsonIndex) dawsonIndex.hidden = next !== "map";
    if (campPeople) campPeople.hidden = next !== "people";
    if (campSources) campSources.hidden = next !== "sources";

    if (next === "map") buildProseMap();
    if (next === "people") buildCampPeople();
  }

  function svgEl(name, attrs = {}, text = "") {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
    if (text) el.textContent = text;
    return el;
  }

  function buildProseMap() {
    if (!proseMapSvg) return;
    proseMapSvg.replaceChildren();

    const reached = Math.max(furthestIndex, fullSequence.indexOf(currentId));
    const ink = "currentColor";

    const backgroundRule = svgEl("line", { x1: 42, y1: 326, x2: 818, y2: 326, class: "map-horizon" });
    proseMapSvg.append(backgroundRule);

    const caption = svgEl("text", { x: 44, y: 356, class: "map-caption" }, "REVEALED BY STORY REACH · NOT A RECONSTRUCTED ROUTE");
    proseMapSvg.append(caption);

    // Night and morning are one held camp occurrence across a time change.
    if (reached >= 0) {
      proseMapSvg.append(
        svgEl("circle", { cx: 105, cy: 244, r: 9, class: "map-node" }),
        svgEl("text", { x: 82, y: 218, class: "map-place" }, "camp"),
        svgEl("text", { x: 82, y: 264, class: "map-small" }, "night")
      );
    }
    if (reached >= 1) {
      proseMapSvg.append(
        svgEl("line", { x1: 105, y1: 234, x2: 105, y2: 188, class: "map-same-ground" }),
        svgEl("text", { x: 82, y: 176, class: "map-small" }, "morning"),
        svgEl("text", { x: 126, y: 205, class: "map-note" }, "same camp · time changes")
      );
    }

    // About fifteen miles southeast: quantity + direction, physical track unresolved.
    if (reached >= 2) {
      proseMapSvg.append(
        svgEl("path", { d: "M 118 238 C 172 226, 220 210, 286 194", class: "map-route-unknown" }),
        svgEl("text", { x: 155, y: 190, class: "map-note" }, "about 15 miles S.E."),
        svgEl("text", { x: 165, y: 207, class: "map-small" }, "traveled line unresolved")
      );
    }

    // Blue Water is one place with multiple apertures, not three separate destinations.
    if (reached >= 3) {
      proseMapSvg.append(
        svgEl("path", { d: "M 326 88 C 307 120, 336 151, 316 184 C 296 217, 324 252, 306 286", class: "map-water" }),
        svgEl("circle", { cx: 306, cy: 188, r: 10, class: "map-node" }),
        svgEl("text", { x: 337, y: 174, class: "map-place" }, "Blue Water"),
        svgEl("text", { x: 337, y: 193, class: "map-small" }, "small branch · exact identity open")
      );
    }
    if (reached >= 4) {
      proseMapSvg.append(
        svgEl("line", { x1: 318, y1: 203, x2: 365, y2: 229, class: "map-same-ground" }),
        svgEl("text", { x: 374, y: 234, class: "map-note" }, "but a dozen beaver"),
        svgEl("text", { x: 374, y: 251, class: "map-small" }, "same creek · attention changes")
      );
    }
    if (reached >= 5) {
      proseMapSvg.append(
        svgEl("line", { x1: 318, y1: 177, x2: 365, y2: 145, class: "map-same-ground" }),
        svgEl("text", { x: 374, y: 142, class: "map-note" }, "Mayes employed as guide"),
        svgEl("text", { x: 374, y: 159, class: "map-small" }, "role changes before ground")
      );
    }

    // Mouth relation is qualitative proximity, not a solved point/route.
    if (reached >= 6) {
      proseMapSvg.append(
        svgEl("path", { d: "M 323 186 C 410 178, 468 164, 554 150", class: "map-proximity" }),
        svgEl("circle", { cx: 574, cy: 147, r: 8, class: "map-node-open" }),
        svgEl("text", { x: 596, y: 142, class: "map-place" }, "mouth of Blue Water"),
        svgEl("text", { x: 596, y: 160, class: "map-small" }, "within a short distance"),
        svgEl("text", { x: 453, y: 190, class: "map-note" }, "qualitative proximity")
      );
    }

    // Regional forecast is an area relation, deliberately not a point.
    if (reached >= 7) {
      proseMapSvg.append(
        svgEl("rect", { x: 654, y: 76, width: 150, height: 202, rx: 70, class: "map-region" }),
        svgEl("text", { x: 678, y: 104, class: "map-place" }, "east of Blue Water"),
        svgEl("text", { x: 678, y: 124, class: "map-small" }, "account forecast / capacity judgment"),
        svgEl("text", { x: 678, y: 145, class: "map-small" }, "not occupied geometry")
      );
    }
  }



  function buildCampSources() {
    if (!campSourceList) return;
    const entries = dawsonRetrieval.filter((entry) => Array.isArray(entry.scenes) && entry.scenes.includes(currentId));
    const fragment = document.createDocumentFragment();

    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "camp-source-empty";
      empty.textContent = "No public retrieval object is indexed for this exact ground yet.";
      fragment.append(empty);
    } else {
      entries.forEach((entry) => {
        const card = document.createElement("article");
        card.className = "camp-source-card";

        const head = document.createElement("div");
        head.className = "camp-source-head";
        const kind = document.createElement("span");
        kind.textContent = "Public derivative";
        const id = document.createElement("code");
        id.textContent = entry.id;
        head.append(kind, id);

        const summary = document.createElement("div");
        summary.className = "camp-source-summary";
        (entry.summary || []).forEach((line) => {
          const p = document.createElement("p");
          p.textContent = line;
          summary.append(p);
        });

        const pointers = document.createElement("p");
        pointers.className = "camp-source-pointers";
        pointers.textContent = "Returns to: " + (entry.source_object_ids || []).join(" · ");

        const brakes = document.createElement("div");
        brakes.className = "camp-source-brakes";
        (entry.brakes || []).forEach((line) => {
          const b = document.createElement("span");
          b.textContent = line;
          brakes.append(b);
        });

        card.append(head, summary, pointers, brakes);
        fragment.append(card);
      });
    }

    campSourceList.replaceChildren(fragment);
  }

  function asksForSources(message) {
    const lower = String(message || "").toLowerCase();
    return /\b(show me (the )?sources|what source|what carries this|where does this come from|show me the record|show me the records|source body|source bodies|jackets? here)\b/.test(lower);
  }

  function buildCampPeople() {
    if (!campPeopleList) return;

    const reachedIndex = Math.max(furthestIndex, fullSequence.indexOf(currentId));
    const encountered = new Map();

    fullSequence.slice(0, reachedIndex + 1).forEach((sceneId) => {
      (peopleByGround[sceneId] || []).forEach((person) => {
        const key = person.name;
        if (!encountered.has(key)) {
          encountered.set(key, {
            ...person,
            firstSeen: sceneId,
            lastSeen: sceneId,
            relations: [person.relation],
            notes: [person.note]
          });
          return;
        }

        const held = encountered.get(key);
        held.lastSeen = sceneId;
        if (person.relation && !held.relations.includes(person.relation)) held.relations.push(person.relation);
        if (person.note && !held.notes.includes(person.note)) held.notes.push(person.note);
      });
    });

    const people = Array.from(encountered.values());
    if (campPeopleCount) {
      campPeopleCount.textContent = people.length
        ? String(people.length).padStart(2, "0") + " held so far"
        : "none yet";
    }

    const batches = new Map();
    people.forEach((person, index) => {
      const batchId = person.firstSeen;
      if (!batches.has(batchId)) batches.set(batchId, []);
      batches.get(batchId).push({ ...person, encounterNumber: index + 1 });
    });

    const fragment = document.createDocumentFragment();

    batches.forEach((batchPeople, batchId) => {
      const batch = document.createElement("section");
      batch.className = "encounter-batch";

      const batchHead = document.createElement("header");
      batchHead.className = "encounter-batch-head";

      const batchLabel = document.createElement("span");
      batchLabel.textContent = trailUi[batchId]?.name || batchId;

      const batchCount = document.createElement("span");
      batchCount.textContent = batchPeople.length + (batchPeople.length === 1 ? " entry" : " entries");

      batchHead.append(batchLabel, batchCount);
      batch.append(batchHead);

      const cards = document.createElement("div");
      cards.className = "encounter-card-grid";

      batchPeople.forEach((person) => {
        const card = document.createElement("details");
        card.className = "person-card";

        const summary = document.createElement("summary");
        summary.className = "person-card-face";

        const serial = document.createElement("span");
        serial.className = "person-card-serial";
        serial.textContent = "PERSON " + String(person.encounterNumber).padStart(2, "0");

        const name = document.createElement("strong");
        name.className = "person-card-name";
        name.textContent = person.name;

        const known = document.createElement("span");
        known.className = "person-card-known";
        known.textContent = person.relations[person.relations.length - 1] || "encountered";

        const mark = document.createElement("span");
        mark.className = "person-card-mark";
        mark.setAttribute("aria-hidden", "true");
        mark.textContent = "+";

        summary.append(serial, name, known, mark);

        const body = document.createElement("div");
        body.className = "person-card-body";

        const first = document.createElement("p");
        first.className = "person-card-field";
        first.innerHTML = "<span>first encountered</span><b></b>";
        first.querySelector("b").textContent = trailUi[person.firstSeen]?.name || person.firstSeen;

        const current = document.createElement("p");
        current.className = "person-card-field";
        current.innerHTML = "<span>known here</span><b></b>";
        current.querySelector("b").textContent = person.relations[person.relations.length - 1] || "—";

        const open = document.createElement("p");
        open.className = "person-card-open";
        open.textContent = person.notes[person.notes.length - 1] || "Nothing further is carried here.";

        body.append(first, current);

        if (person.relations.length > 1) {
          const history = document.createElement("div");
          history.className = "person-card-history";
          const label = document.createElement("span");
          label.textContent = "other held relations";
          history.append(label);
          person.relations.slice(0, -1).forEach((relation) => {
            const p = document.createElement("p");
            p.textContent = relation;
            history.append(p);
          });
          body.append(history);
        }

        body.append(open);
        card.append(summary, body);
        cards.append(card);
      });

      batch.append(cards);
      fragment.append(batch);
    });

    campPeopleList.replaceChildren(fragment);
  }

  function asksForMap(message) {
    const lower = String(message || "").toLowerCase();
    return /\b(show me (the )?map|map|where have i been|where are we|what ground have i reached|show the ground|what have i reached)\b/.test(lower);
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
    buildCampSources();
    buildProseMap();
    syncDiscoveryChrome();
    target.focus({ preventScroll: true });
  }

  function remember(id) {
    try {
      window.localStorage.setItem("earthly-hands-footing-v3", id);
      const index = fullSequence.indexOf(id);
      if (index > furthestIndex) {
        furthestIndex = index;
        window.localStorage.setItem("earthly-hands-story-reach-v3", String(furthestIndex));
      }
    } catch (_) {
      const index = fullSequence.indexOf(id);
      if (index > furthestIndex) furthestIndex = index;
    }
  }

  function forget() {
    try {
      window.localStorage.removeItem("earthly-hands-footing-v3");
      window.localStorage.removeItem("earthly-hands-story-reach-v3");
      window.localStorage.removeItem("earthly-hands-discovery-open-v3");
      window.localStorage.removeItem("earthly-hands-thought-given-v3");
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
    const thoughtTurn = !discoveryOpen && !thresholdThoughtGiven;
    if (!thoughtTurn && !discoveryOpen) openDiscovery();

    if (!thoughtTurn && asksForMap(clean) && mapIsEarned()) {
      keepTenWords(clean);
      talkInput.value = "";
      sizeTalkInput();
      setDawsonView("map");
      return;
    }

    if (!thoughtTurn && asksForPeople(clean) && encounteredPeopleCount() > 0) {
      keepTenWords(clean);
      talkInput.value = "";
      sizeTalkInput();
      buildCampPeople();
      setDawsonView("people");
      return;
    }

    if (!thoughtTurn && asksForSources(clean)) {
      keepTenWords(clean);
      talkInput.value = "";
      sizeTalkInput();
      buildCampSources();
      setDawsonView("sources");
      return;
    }

    if (!thoughtTurn && !discoveryOpen) openDiscovery();
    receiveTenAction(clean);
    const localMove = thoughtTurn ? null : localMoveFromWords(clean);
    const movementResolved = Boolean(localMove && canMove(origin, localMove));
    if (!thoughtTurn) keepTenWords(clean);
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
      "DOOR: Shared Country / discovery ground.",
      "LOCAL JOB: recompose only the present held scene. The visitor is discovering the record from inside the experience. Do not announce the report writer, source title, larger expedition, or future story merely because the backend knows them. Reveal identity, carrier, people, and place only when Ten's question or already-earned public ground supports that reveal. Do not claim that a companion is physically or historically present in 1831.",
      "VOICE: plain, testimonial, unresolved. Prefer exact nouns and earned verbs. Do not perform significance.",
      thoughtTurn
        ? "THRESHOLD TURN: this is the visitor's first contact with the ground. Return one short line only in view. Do not name Dawson, the report, the expedition, the date, the route, or future places unless Ten's exact question has already earned that fact. The line may orient, refuse, or expose one concrete thing. Do not explain the mechanic."
        : "DISCOVERY TURN: reveal only what the visitor has earned through the current public ground and conversation. Do not front-load the larger body.",
      "CONTINUITY: when Ten asks a fresh question without moving, make the current-ground continuity legible. Prefer words such as still / remain / same ground when accurate so a new answer does not look like a new historical movement.",
      "COMPOSITION: the title is an active part of the answer. Change it when the question genuinely changes the aperture or documentary job. A short answer may stay spare; a rich held answer may use several paragraphs and fill the available field. Do not pad for length.",
      "STATUS LABELING: when useful, say what kind of thing is being shown — direct source statement, attributed judgment/forecast, public derivative, unresolved edge, or reversible visitor experience. Do not blur those classes.",
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
      `CORPUS HITS: ${JSON.stringify(corpusHits)}`,
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
      if (!patch) {
        throw new Error("Worker returned an invalid Shared Country scene contract");
      }

      if (thoughtTurn) {
        showThresholdThought(patch);
      } else {
        const patchOrigin = currentId;
        const result = applyScenePatch(patchOrigin, patch);
        if (!movementResolved && result.moveTo && canMove(patchOrigin, result.moveTo)) {
          landAt(result.moveTo);
        }
      }

      conversation.push({ role: "user", content: clean });
      if (conversation.length > 4) conversation.splice(0, conversation.length - 4);
    } catch (error) {
      console.error("Shared Country listening error:", error);
      const scene = sceneById.get(currentId);
      const companion = scene?.querySelector(".companion-footing");
      if (companion) companion.textContent = "";
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

  buildProseMap();
  setDawsonView("ground");

  document.querySelectorAll("[data-depth]").forEach((control) => {
    control.addEventListener("click", () => openDepthPanel(control));
  });

  document.querySelectorAll("[data-prompt]").forEach((control) => {
    control.addEventListener("click", () => askGround(control.dataset.prompt));
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

  let initialId = "night";

  if (discoveryOpen) {
    const hashId = window.location.hash.slice(1);
    if (fullSequence.includes(hashId)) {
      initialId = hashId;
    } else {
      try {
        initialId = window.localStorage.getItem("earthly-hands-footing-v3") || "night";
      } catch (_) {
        initialId = "night";
      }
    }
  } else {
    furthestIndex = 0;
  }

  if (!fullSequence.includes(initialId)) initialId = "night";
  currentId = initialId;
  furthestIndex = Math.max(furthestIndex, fullSequence.indexOf(initialId));
  setLamp(true);
  history.replaceState({ place: initialId }, "", discoveryOpen ? `#${initialId}` : window.location.pathname);
  showScene(sceneById.get(initialId), "forward");
  document.body.dataset.thought = thresholdThoughtGiven ? "given" : "none";
  syncDiscoveryChrome();

  const specimenIndex = document.querySelector(".specimen-index");
  if (specimenIndex) {
    [...specimenIndex.children]
      .filter((node) => node.matches?.("[data-touched]"))
      .sort((a, b) => Date.parse(b.dataset.touched) - Date.parse(a.dataset.touched))
      .forEach((node) => specimenIndex.append(node));
  }

  steps.forEach((step) => step.setAttribute("aria-live", "polite"));
})();
