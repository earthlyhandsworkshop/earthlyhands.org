(() => {
  const lamp = document.querySelector("#lamp-control");
  const lampLabel = lamp?.querySelector(".lamp-label") || null;
  const lanternHome = document.querySelector("#lantern-home");
  const lanternNote = document.querySelector(".lantern-note");
  const talkForm = document.querySelector("#talk-form");
  const talkInput = document.querySelector("#talk-input");
  const talkSend = document.querySelector("#talk-send");
  const groundHint = document.querySelector("#ground-hint");
  const groundHintCopy = document.querySelector("#ground-hint-copy");
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
  const experienceBearing = document.querySelector("#experience-bearing");
  const thresholdIntro = document.querySelector("#threshold-intro");
  const experienceMount = document.querySelector("#experience-mount");
  const dawsonIndex = document.querySelector("#dawson-index");
  const proseMapSvg = document.querySelector("#prose-map-svg");
  const campPeople = document.querySelector("#camp-people");
  const campPeopleList = document.querySelector(".camp-people-list");
  const campPeopleCount = document.querySelector("#camp-people-count");
  const campSources = document.querySelector("#camp-sources");
  const campSourceList = document.querySelector(".camp-source-list");
  const campSourcesContext = document.querySelector("#camp-sources-context");
  const campJacket = document.querySelector("#camp-jacket");
  const campJacketBody = document.querySelector(".camp-jacket-body");
  const campJacketTitle = document.querySelector("#camp-jacket-title");
  const campJacketContext = document.querySelector("#camp-jacket-context");
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
  // Story aperture and physical held ground are separate browser-owned states.
  // Blue Water's beaver and guide apertures advance the story without relocating the visitor.
  const heldGroundAliases = {
    "blue-water": "blue-water",
    dozen: "blue-water",
    guide: "blue-water"
  };

  function heldGroundIdFor(id) {
    return heldGroundAliases[id] || id;
  }

  function heldGroundNameFor(id) {
    const heldId = heldGroundIdFor(id);
    return sceneById.get(heldId)?.dataset.place || trailUi[heldId]?.name || "the ground";
  }

  // Shared Country change grammar. The browser owns why the composition changed.
  // Model prose may recompose a scene, but it cannot redefine movement, held ground,
  // instrument change, source descent, return, or stillness.
  function setChangePhysics(kind, text = "") {
    const allowed = new Set(["still", "attention", "movement", "instrument", "source", "return"]);
    const next = allowed.has(kind) ? kind : "still";
    if (experienceShell) experienceShell.dataset.change = next;
    if (experienceBearing) {
      experienceBearing.textContent = text;
      experienceBearing.hidden = !text;
    }
  }

  function bearingForView(view) {
    const held = heldGroundNameFor(currentId);
    const aperture = trailUi[currentId]?.name || currentId;
    if (view === "map") return { kind:"instrument", text:`Map · what has become reachable from ${held}` };
    if (view === "people") return { kind:"instrument", text:`People · encountered through ${aperture}` };
    if (view === "sources") return { kind:"source", text:`Source descent · ${held} remains held` };
    if (view === "jacket") return { kind:"instrument", text:`Jacket · available depth at ${held}` };
    return { kind:"still", text: held };
  }

  const apiUrl = String(window.EARTHLY_HANDS_API_URL || "").trim();
  const conversation = [];
  let dawsonRetrieval = [];

  fetch("/data/dawson/retrieval.public.v0.json", { cache: "no-store" })
    .then((response) => response.ok ? response.json() : null)
    .then((payload) => {
      if (payload && Array.isArray(payload.entries)) {
        dawsonRetrieval = payload.entries;
        syncDiscoveryChrome();
        if (experienceShell?.dataset.view === "sources") buildCampSources();
      }
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

  // A deliberate fresh crossing is different from an ordinary return.
  // ?fresh=1 clears only Shared Country's visitor-experience browser state,
  // then removes itself from the URL so the new visitor can proceed normally.
  const freshEntry = new URLSearchParams(window.location.search).get("fresh") === "1";
  if (freshEntry) {
    try {
      [
        "earthly-hands-footing-v3",
        "earthly-hands-story-reach-v3",
        "earthly-hands-discovery-open-v3",
        "earthly-hands-thought-given-v3",
        "earthly-hands-jacket-reach-v1"
      ].forEach((key) => window.localStorage.removeItem(key));
      window.sessionStorage.removeItem("earthly-hands-discovery-scene-v3");
    } catch (_) {
      // Fresh entry still degrades safely when browser storage is unavailable.
    }

    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState(window.history.state, "", cleanUrl);
  }


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

  // Public-facing person/group bodies. These do not replace the source-local
  // encounter rows above; they let People grow into a readable Name Web front.
  const personProfiles = {
    "small guard": {
      kind: "group body",
      display: "Small guard",
      summary: "A camp precaution named as a body, not a roster.",
      carried: "Posted round the camp during the night after the alarm.",
      open: "Who composed the guard, how long it remained posted, and whether either ford-watch man belonged to it are not carried here.",
      links: ["two unnamed men", "traveling party"]
    },
    "two unnamed men": {
      kind: "unnamed pair",
      display: "Two unnamed men",
      summary: "Two people given an assignment without names or a returned ending.",
      carried: "Sent back toward the river ford on the back trail to watch.",
      open: "The account does not presently state that they reached the ford, completed the watch, returned, or rejoined the party.",
      links: ["small guard", "traveling party"]
    },
    "traveling party": {
      kind: "collective carrier",
      display: "Traveling party",
      summary: "The moving body carried by Dawson's report; not yet a complete roster.",
      carried: "Present through camp, southeast movement, and the Blue Water encounter.",
      open: "Group continuity does not supply every member's identity at every aperture.",
      links: ["Mr. Mayes", "Mr. Criner"]
    },
    "Mr. Mayes": {
      kind: "named person",
      display: "Mr. Mayes",
      summary: "Found at Blue Water trapping beaver; later carried as guide.",
      carried: "Found with Criner on this creek. Dawson separately states residence on James’ Fork of Poteau.",
      open: "Encounter place is not residence. Guide employment does not supply terms, pay, exact route, or arrival at Kiamiche.",
      links: ["Mr. Criner", "traveling party"]
    },
    "Mr. Criner": {
      kind: "named person",
      display: "Mr. Criner",
      summary: "Found with Mayes at Blue Water and induced to accompany the delegation.",
      carried: "Found on the creek trapping beaver; separately said to reside on James’ Fork of Poteau.",
      open: "The report does not make Criner a guide and does not divide the dozen-beaver catch between the two men.",
      links: ["Mr. Mayes", "traveling party"]
    },
    "Col. George S. Gaines": {
      kind: "named person",
      display: "Col. George S. Gaines",
      summary: "Named in the inducement relation that brings Mayes and Criner alongside the delegation.",
      carried: "Named with Reynolds as inducing Mayes and Criner to accompany the delegation as far as Kiamiche.",
      open: "This sentence alone does not settle later movement, employment terms, or every institutional role.",
      links: ["Col. Reynolds", "Mr. Mayes", "Mr. Criner"]
    },
    "Col. Reynolds": {
      kind: "named person",
      display: "Col. Reynolds",
      summary: "Named with Gaines in the accompaniment relation.",
      carried: "Named with Gaines as inducing Mayes and Criner to accompany the delegation.",
      open: "The source does not turn Reynolds into Mayes's guide employer simply by proximity in the sentence.",
      links: ["Col. George S. Gaines", "Mr. Mayes", "Mr. Criner"]
    },
    "J. L. Dawson": {
      kind: "named person / narrator",
      display: "J. L. Dawson",
      summary: "Writer of the held report and speaker of the later prospect and forecast statements.",
      carried: "Writes from Cantonment Gibson on 29 January 1831 about the western exploring delegation.",
      open: "Report authorship does not make every historical event independently verified.",
      links: ["traveling party"]
    }
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

  function publicGroundFromWords(message) {
    const shared = window.EarthlyHandsWayfinding?.resolve(message);
    if (shared) return shared.path;

    const lower = String(message || "").toLowerCase();
    const asksToGo = /\b(take me|go to|go see|show me|open|visit|enter|walk to|bring me to)\b/.test(lower);
    if (!asksToGo) return null;

    const creekLookBack = /\b(creek[ -]?look[ -]?back|line commons|look back from (?:the )?creek|workshop from (?:the )?creek)\b/.test(lower);
    if (creekLookBack) return "/grounds/line-commons/creek-look-back/";

    return null;
  }

  function localMoveFromWords(message) {
    const lower = String(message || "").toLowerCase();

    const followsDawson = /\bfollow (?:dawson|the account|the story)\b/.test(lower);
    const forward = followsDawson || /\b(go|walk|head|move|continue|follow|travel|leave|carry on|move on)\b/.test(lower);
    const backward = /\b(go back|walk back|head back|move back|return|backtrack)\b/.test(lower);

    if (followsDawson) {
      const index = fullSequence.indexOf(currentId);
      if (index >= 0 && index < fullSequence.length - 1) return fullSequence[index + 1];
    }

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

  function jacketReachSet() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem("earthly-hands-jacket-reach-v1") || "[]");
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (_) {
      return new Set();
    }
  }

  function jacketIsEarned(id = currentId) {
    const reach = jacketReachSet();
    return reach.has(heldGroundIdFor(id)) || reach.size > 0;
  }

  function earnGroundJacket(id = currentId) {
    const heldId = heldGroundIdFor(id);
    const reach = jacketReachSet();
    if (reach.has(heldId)) return;
    reach.add(heldId);
    try {
      window.localStorage.setItem("earthly-hands-jacket-reach-v1", JSON.stringify(Array.from(reach)));
    } catch (_) {}
    syncDiscoveryChrome();
  }

  function syncDiscoveryChrome() {
    const peopleButton = document.querySelector('[data-dawson-view="people"]');
    const mapButton = document.querySelector('[data-dawson-view="map"]');
    const sourcesButton = document.querySelector('[data-dawson-view="sources"]');
    const jacketButton = document.querySelector('[data-dawson-view="jacket"]');

    if (peopleButton) peopleButton.hidden = !discoveryOpen || encounteredPeopleCount() === 0;
    if (mapButton) mapButton.hidden = !discoveryOpen || !mapIsEarned();
    if (sourcesButton) {
      const hasSourceDepth = dawsonRetrieval.some((entry) => Array.isArray(entry.scenes) && entry.scenes.includes(currentId));
      sourcesButton.hidden = !discoveryOpen || !(hasSourceDepth || jacketReachSet().size > 0);
    }
    if (jacketButton) jacketButton.hidden = !discoveryOpen || !jacketIsEarned();

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
    const next = ["ground", "map", "people", "sources", "jacket"].includes(view) ? view : "ground";
    const previous = experienceShell?.dataset.view || "ground";
    if (experienceShell) experienceShell.dataset.view = next;

    const bearing = bearingForView(next);
    if (next === "ground" && previous !== "ground") {
      setChangePhysics("return", `Returned · ${heldGroundNameFor(currentId)}`);
    } else {
      setChangePhysics(bearing.kind, bearing.text);
    }

    viewModes.forEach((button) => {
      const active = button.dataset.dawsonView === next;
      button.classList.toggle("is-current", active);
      button.setAttribute("aria-pressed", String(active));

      if (button.dataset.dawsonView === "ground") {
        const heldPlace = heldGroundNameFor(currentId);
        const depthView = next === "sources" || next === "jacket";
        button.textContent = depthView ? `Return to ${heldPlace}` : "Ground";
        button.setAttribute(
          "aria-label",
          depthView ? `Return to ${heldPlace} without moving the story` : "Ground"
        );
      }
    });

    if (experienceMount) experienceMount.hidden = next === "map" || next === "people" || next === "sources" || next === "jacket";
    if (dawsonIndex) dawsonIndex.hidden = next !== "map";
    if (campPeople) campPeople.hidden = next !== "people";
    if (campSources) campSources.hidden = next !== "sources";
    if (campJacket) campJacket.hidden = next !== "jacket";

    if (next === "map") buildProseMap();
    if (next === "people") buildCampPeople();
    if (next === "sources") buildCampSources();
    if (next === "jacket") buildGroundJacket();

    if (next !== previous) {
      const eventByView = { map:"OPENED_MAP", people:"OPENED_PEOPLE", sources:"OPENED_SOURCES", jacket:"OPENED_JACKET" };
      if (eventByView[next]) {
        listen(eventByView[next], { ground:heldGroundIdFor(currentId), instrument:next, aperture:currentId });
      } else if (next === "ground" && previous !== "ground") {
        listen("RETURNED", { ground:heldGroundIdFor(currentId), instrument:"ground", aperture:currentId });
      }
    }
  }

  function svgEl(name, attrs = {}, text = "") {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
    if (text) el.textContent = text;
    return el;
  }


  function mapLabelBox(text, x, y, size = 11) {
    // Deliberately simple and deterministic. The anchor belongs to evidence;
    // only the label is allowed to negotiate around occupied text.
    const width = Math.max(18, String(text).length * size * 0.57);
    const height = size * 1.35;
    return { x, y: y - height, width, height };
  }

  function mapBoxesOverlap(a, b, pad = 5) {
    return !(
      a.x + a.width + pad < b.x ||
      b.x + b.width + pad < a.x ||
      a.y + a.height + pad < b.y ||
      b.y + b.height + pad < a.y
    );
  }

  function placeMapLabel(parent, occupied, text, anchorX, anchorY, {
    className = "map-note",
    size = 11,
    candidates = [[10,-8],[10,12],[-10,-8],[-10,12],[20,-24],[20,28]],
    align = "start"
  } = {}) {
    let chosen = candidates[0];
    for (const candidate of candidates) {
      const [dx,dy] = candidate;
      const width = Math.max(18, String(text).length * size * 0.57);
      const x = align === "end" ? anchorX + dx - width : anchorX + dx;
      const box = mapLabelBox(text, x, anchorY + dy, size);
      if (!occupied.some((held) => mapBoxesOverlap(box, held))) {
        chosen = candidate;
        occupied.push(box);
        break;
      }
    }

    const [dx,dy] = chosen;
    const width = Math.max(18, String(text).length * size * 0.57);
    const x = align === "end" ? anchorX + dx - width : anchorX + dx;
    const box = mapLabelBox(text, x, anchorY + dy, size);
    if (!occupied.includes(box)) occupied.push(box);
    const label = svgEl("text", { x, y: anchorY + dy, class: className }, text);
    parent.append(label);
    return label;
  }

  function buildProseMap() {
    if (!proseMapSvg) return;
    proseMapSvg.replaceChildren();

    const reached = Math.max(furthestIndex, fullSequence.indexOf(currentId));
    const occupied = [];

    proseMapSvg.append(
      svgEl("line", { x1: 42, y1: 326, x2: 818, y2: 326, class: "map-horizon" }),
      svgEl("text", { x: 44, y: 356, class: "map-caption" }, "REVEALED BY STORY REACH · NOT A RECONSTRUCTED ROUTE")
    );

    // Anchors are documentary claims. Labels are the only things that move to make room.
    if (reached >= 0) {
      proseMapSvg.append(svgEl("circle", { cx: 105, cy: 244, r: 9, class: "map-node" }));
      placeMapLabel(proseMapSvg, occupied, "camp", 105, 244, {
        className:"map-place", size:16, candidates:[[-23,-25],[15,-24],[-23,31]]
      });
      placeMapLabel(proseMapSvg, occupied, "night", 105, 244, {
        className:"map-small", size:9, candidates:[[-23,23],[16,19]]
      });
    }

    if (reached >= 1) {
      proseMapSvg.append(svgEl("line", { x1:105,y1:234,x2:105,y2:188,class:"map-same-ground" }));
      placeMapLabel(proseMapSvg, occupied, "morning", 105, 188, {
        className:"map-small", size:9, candidates:[[-23,-12],[14,-8]]
      });
      placeMapLabel(proseMapSvg, occupied, "same camp · time changes", 105, 211, {
        className:"map-note", size:11, candidates:[[22,-4],[24,18],[-150,-4]]
      });
    }

    if (reached >= 2) {
      proseMapSvg.append(svgEl("path", { d:"M 118 238 C 172 226, 220 210, 286 194", class:"map-route-unknown" }));
      placeMapLabel(proseMapSvg, occupied, "about 15 miles S.E.", 204, 211, {
        className:"map-note", size:11, candidates:[[-48,-19],[-48,31],[16,-20]]
      });
      placeMapLabel(proseMapSvg, occupied, "traveled line unresolved", 210, 213, {
        className:"map-small", size:9, candidates:[[-38,10],[-42,43],[18,9]]
      });
    }

    if (reached >= 3) {
      proseMapSvg.append(
        svgEl("path", { d:"M 326 88 C 307 120, 336 151, 316 184 C 296 217, 324 252, 306 286", class:"map-water" }),
        svgEl("circle", { cx:306,cy:188,r:10,class:"map-node" })
      );
      placeMapLabel(proseMapSvg, occupied, "Blue Water", 306, 188, {
        className:"map-place", size:16, candidates:[[30,-14],[30,15],[-116,-16]]
      });
      placeMapLabel(proseMapSvg, occupied, "small branch · exact identity open", 306, 188, {
        className:"map-small", size:9, candidates:[[30,10],[30,35],[-175,11]]
      });
    }

    if (reached >= 4) {
      proseMapSvg.append(svgEl("line", { x1:318,y1:203,x2:365,y2:229,class:"map-same-ground" }));
      placeMapLabel(proseMapSvg, occupied, "but a dozen beaver", 365, 229, {
        className:"map-note", size:11, candidates:[[12,4],[12,26],[12,-20]]
      });
      placeMapLabel(proseMapSvg, occupied, "same creek · attention changes", 365, 229, {
        className:"map-small", size:9, candidates:[[12,22],[12,44],[12,-38]]
      });
    }

    if (reached >= 5) {
      proseMapSvg.append(svgEl("line", { x1:318,y1:177,x2:365,y2:145,class:"map-same-ground" }));
      placeMapLabel(proseMapSvg, occupied, "Mayes employed as guide", 365, 145, {
        className:"map-note", size:11, candidates:[[12,-4],[12,-26],[12,18]]
      });
      placeMapLabel(proseMapSvg, occupied, "role changes before ground", 365, 145, {
        className:"map-small", size:9, candidates:[[12,14],[12,-43],[12,36]]
      });
    }

    if (reached >= 6) {
      proseMapSvg.append(
        svgEl("path", { d:"M 323 186 C 410 178, 468 164, 554 150", class:"map-proximity" }),
        svgEl("circle", { cx:574,cy:147,r:8,class:"map-node-open" })
      );
      placeMapLabel(proseMapSvg, occupied, "mouth of Blue Water", 574, 147, {
        className:"map-place", size:16, candidates:[[22,-5],[22,22],[-172,-28]]
      });
      placeMapLabel(proseMapSvg, occupied, "within a short distance", 574, 147, {
        className:"map-small", size:9, candidates:[[22,17],[22,40],[-145,-8]]
      });
      placeMapLabel(proseMapSvg, occupied, "qualitative proximity", 458, 178, {
        className:"map-note", size:11, candidates:[[-28,24],[-25,-17],[18,25]]
      });
    }

    if (reached >= 7) {
      proseMapSvg.append(svgEl("rect", { x:654,y:76,width:150,height:202,rx:70,class:"map-region" }));
      placeMapLabel(proseMapSvg, occupied, "east of Blue Water", 676, 108, {
        className:"map-place", size:16, candidates:[[0,0],[-16,24]]
      });
      placeMapLabel(proseMapSvg, occupied, "account forecast / capacity judgment", 676, 131, {
        className:"map-small", size:9, candidates:[[0,0],[-20,23]]
      });
      placeMapLabel(proseMapSvg, occupied, "not occupied geometry", 676, 151, {
        className:"map-small", size:9, candidates:[[0,0],[-18,22]]
      });
    }
  }


  function buildCampSources() {
    if (!campSourceList) return;

    earnGroundJacket(currentId);
    const heldName = heldGroundNameFor(currentId);
    const apertureName = trailUi[currentId]?.name || currentId;
    if (campSourcesContext) {
      const heldAperture = heldGroundIdFor(currentId) !== currentId;
      campSourcesContext.textContent = heldAperture
        ? `Held ground · ${heldName} · story aperture · ${apertureName}. Looking down has not moved you.`
        : `Held ground · ${heldName}. Looking down has not moved you.`;
    }

    const entries = dawsonRetrieval.filter((entry) => Array.isArray(entry.scenes) && entry.scenes.includes(currentId));
    const fragment = document.createDocumentFragment();

    const jacket = document.createElement("details");
    jacket.className = "ground-jacket";
    const jacketSummary = document.createElement("summary");
    jacketSummary.innerHTML = "<span>Ground jacket</span><strong>" + heldName + "</strong>";
    const jacketBody = document.createElement("div");
    jacketBody.className = "ground-jacket-body";

    const jacketFields = [
      ["HELD GROUND", heldName],
      ["PRESENT APERTURE", apertureName],
      ["SOURCE DESCENT", "Depth inside the same ground. Opening this view has not moved the story."],
      ["PUBLIC BOUNDARY", "This surface carries released derivatives and controlled source pointers. It does not manufacture an unreleased exact carrier."],
      ["RETURN", "Ground returns to the same story aperture."]
    ];
    jacketFields.forEach(([labelText,valueText]) => {
      const row = document.createElement("div");
      row.className = "ground-jacket-row";
      const label = document.createElement("span");
      label.textContent = labelText;
      const value = document.createElement("p");
      value.textContent = valueText;
      row.append(label,value);
      jacketBody.append(row);
    });
    jacket.append(jacketSummary,jacketBody);
    fragment.append(jacket);

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
        const ids = (entry.source_object_ids || []).join(" · ");
        pointers.textContent = ids
          ? "Controlled source return · " + ids + " · original host is a separate deliberate door when released."
          : "Controlled source return remains inside Earthly Hands at this public depth.";

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

  function buildGroundJacket() {
    if (!campJacketBody || !campJacketTitle) return;

    const heldId = heldGroundIdFor(currentId);
    const heldName = heldGroundNameFor(currentId);
    const reachedIndex = Math.max(furthestIndex, fullSequence.indexOf(currentId));
    const apertures = fullSequence
      .slice(0, reachedIndex + 1)
      .filter((sceneId) => heldGroundIdFor(sceneId) === heldId);

    const sourceEntries = dawsonRetrieval.filter((entry) =>
      Array.isArray(entry.scenes) && entry.scenes.some((sceneId) => apertures.includes(sceneId))
    );

    const carried = [];
    apertures.forEach((sceneId) => {
      (sourceFloor[sceneId] || []).forEach((line) => {
        if (!carried.includes(line)) carried.push(line);
      });
    });

    const brakes = [];
    sourceEntries.forEach((entry) => {
      (entry.brakes || []).forEach((line) => {
        if (!brakes.includes(line)) brakes.push(line);
      });
    });

    const people = [];
    apertures.forEach((sceneId) => {
      (peopleByGround[sceneId] || []).forEach((person) => {
        const display = personProfiles[person.name]?.display || person.name;
        if (!people.includes(display)) people.push(display);
      });
    });

    campJacketTitle.textContent = heldName;
    if (campJacketContext) {
      campJacketContext.textContent = `Present aperture · ${trailUi[currentId]?.name || currentId}. Prior depth remains available without being forced open.`;
    }

    const fragment = document.createDocumentFragment();

    const intro = document.createElement("p");
    intro.className = "jacket-intro";
    intro.textContent = "This jacket became reachable after source depth was opened here. It records available depth; it does not replace the present ground.";
    fragment.append(intro);

    const addSection = (labelText, values, className = "") => {
      if (!values.length) return;
      const section = document.createElement("section");
      section.className = "jacket-section " + className;
      const label = document.createElement("h3");
      label.textContent = labelText;
      const body = document.createElement("div");
      body.className = "jacket-section-body";
      values.forEach((valueText) => {
        const p = document.createElement("p");
        p.textContent = valueText;
        body.append(p);
      });
      section.append(label, body);
      fragment.append(section);
    };

    addSection("PRESENTLY CARRIES", carried);
    addSection("PEOPLE REACHED HERE", people);
    addSection("SOURCE / REPRESENTATION", sourceEntries.map((entry) =>
      `Public derivative ${entry.id} · controlled return ${(entry.source_object_ids || []).join(" · ") || "not yet released"}`
    ));
    addSection("REFUSES / REMAINS OPEN", brakes, "jacket-open");

    const returnSection = document.createElement("section");
    returnSection.className = "jacket-section jacket-return";
    const returnLabel = document.createElement("h3");
    returnLabel.textContent = "RETURN";
    const returnBody = document.createElement("div");
    returnBody.className = "jacket-section-body";
    const returnText = document.createElement("p");
    returnText.textContent = `Return restores ${heldName} at the ${trailUi[currentId]?.name || currentId} aperture.`;
    returnBody.append(returnText);
    returnSection.append(returnLabel, returnBody);
    fragment.append(returnSection);

    campJacketBody.replaceChildren(fragment);
  }

  function asksForSources(message) {
    const lower = String(message || "").toLowerCase();
    return /\b(show me (the )?sources|what source|what carries this|where does this come from|show me the record|show me the records|source body|source bodies|jackets? here)\b/.test(lower);
  }

  function asksForFreshThread(message) {
    const lower = String(message || "").toLowerCase().trim();
    return /^(?:open|start|begin|make)?\s*(?:a\s*)?(?:fresh|new)\s*(?:thread|aperture|conversation|thing)?\s*(?:here|again)?[.!?]*$/.test(lower)
      || /\b(start fresh|open fresh|fresh thread|new thread|new little thing)\b/.test(lower);
  }

  function asksForResetVisit(message) {
    const lower = String(message || "").toLowerCase();
    return /\b(reset (?:this )?visit|start as (?:a )?new visitor|start from scratch|first[- ]time visitor|clear (?:this )?visit)\b/.test(lower);
  }

  function startFreshThread() {
    conversation.splice(0, conversation.length);
    listen("FRESH_STARTED", { ground:heldGroundIdFor(currentId), instrument:experienceShell?.dataset.view||"ground", aperture:currentId });
    if (groundThread) {
      const note = document.createElement("p");
      note.className = "fresh-thread-note";
      note.textContent = `Fresh thread · ${heldGroundNameFor(currentId)}. Earlier reach remains available.`;
      groundThread.replaceChildren(note);
    }
    closeDepth();
    setDawsonView("ground");
    setChangePhysics("still", `${heldGroundNameFor(currentId)} · fresh thread`);
  }

  function resetVisit() {
    const url = new URL(window.location.href);
    url.search = "?fresh=1";
    url.hash = "";
    window.location.assign(url.pathname + url.search);
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
            encounters: [{ sceneId, relation:person.relation, note:person.note }]
          });
          return;
        }
        const held = encountered.get(key);
        held.lastSeen = sceneId;
        held.encounters.push({ sceneId, relation:person.relation, note:person.note });
      });
    });

    const people = Array.from(encountered.values());
    if (campPeopleCount) {
      const named = people.filter(p => personProfiles[p.name]?.kind?.startsWith("named person")).length;
      campPeopleCount.textContent = people.length
        ? `${String(people.length).padStart(2,"0")} encountered · ${named} named`
        : "none yet";
    }

    const batches = new Map();
    people.forEach((person, index) => {
      const batchId = person.firstSeen;
      if (!batches.has(batchId)) batches.set(batchId, []);
      batches.get(batchId).push({ ...person, encounterNumber:index + 1 });
    });

    const fragment = document.createDocumentFragment();
    const intro = document.createElement("div");
    intro.className = "people-intro";
    intro.innerHTML = "<p>People grows from encounter. Named people, unnamed people, and collective bodies stay different until the record earns more.</p><p>Open a body to see what has accumulated; recurrence adds another encounter without silently adding certainty.</p>";
    fragment.append(intro);

    const orderedBatches = Array.from(batches.entries()).sort(([a],[b]) => fullSequence.indexOf(b) - fullSequence.indexOf(a));

    orderedBatches.forEach(([batchId,batchPeople]) => {
      const batch = document.createElement("section");
      batch.className = "encounter-batch";

      const batchHead = document.createElement("header");
      batchHead.className = "encounter-batch-head";
      const left = document.createElement("div");
      const batchLabel = document.createElement("strong");
      batchLabel.textContent = trailUi[batchId]?.name || batchId;
      const batchNote = document.createElement("span");
      batchNote.textContent = "first encountered here";
      left.append(batchLabel,batchNote);
      const batchCount = document.createElement("span");
      batchCount.textContent = batchPeople.length + (batchPeople.length===1 ? " body" : " bodies");
      batchHead.append(left,batchCount);
      batch.append(batchHead);

      const cards = document.createElement("div");
      cards.className = "encounter-card-grid";

      batchPeople.forEach((person) => {
        const profile = personProfiles[person.name] || {};
        const card = document.createElement("details");
        card.className = "person-card";
        card.dataset.person = person.name;

        const summary = document.createElement("summary");
        summary.className = "person-card-face";

        const meta = document.createElement("span");
        meta.className = "person-card-serial";
        meta.textContent = (profile.kind || "encounter body").toUpperCase();

        const name = document.createElement("strong");
        name.className = "person-card-name";
        name.textContent = profile.display || person.name;

        const known = document.createElement("span");
        known.className = "person-card-known";
        known.textContent = profile.summary || person.encounters.at(-1)?.relation || "encountered";

        const mark = document.createElement("span");
        mark.className = "person-card-mark";
        mark.setAttribute("aria-hidden","true");
        mark.textContent = "+";
        summary.append(meta,name,known,mark);

        const body = document.createElement("div");
        body.className = "person-card-body";

        const carried = document.createElement("p");
        carried.className = "person-card-prose";
        carried.textContent = profile.carried || person.encounters.at(-1)?.relation || "";

        const chronology = document.createElement("div");
        chronology.className = "person-encounter-line";
        person.encounters.forEach((encounter,idx) => {
          const row = document.createElement("div");
          row.className = "person-encounter";
          const where = document.createElement("span");
          where.textContent = trailUi[encounter.sceneId]?.name || encounter.sceneId;
          const relation = document.createElement("p");
          relation.textContent = encounter.relation || "occurs";
          row.append(where,relation);
          chronology.append(row);
        });

        const open = document.createElement("p");
        open.className = "person-card-open";
        open.textContent = profile.open || person.encounters.at(-1)?.note || "Nothing further is carried here.";

        body.append(carried,chronology,open);

        const visibleLinks=(profile.links||[]).filter(link => encountered.has(link));
        if(visibleLinks.length){
          const rel=document.createElement("div");
          rel.className="person-links";
          const label=document.createElement("span");
          label.textContent="reachable relations";
          rel.append(label);
          visibleLinks.forEach(linkName=>{
            const button=document.createElement("button");
            button.type="button";
            button.className="person-link";
            button.textContent=personProfiles[linkName]?.display || linkName;
            button.addEventListener("click",()=>{
              const target=campPeopleList.querySelector(`[data-person="${CSS.escape(linkName)}"]`);
              if(target){
                target.open=true;
                target.scrollIntoView({behavior:"smooth",block:"center"});
                target.querySelector("summary")?.focus({preventScroll:true});
              }
            });
            rel.append(button);
          });
          body.append(rel);
        }

        card.append(summary,body);
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
    setGround(heldGroundIdFor(target.id));

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

    const fromId = currentId;
    const fromIndex = fullSequence.indexOf(fromId);
    const toIndex = fullSequence.indexOf(id);
    const direction = toIndex < fromIndex ? "back" : "forward";
    const sameHeldGround = heldGroundIdFor(fromId) === heldGroundIdFor(id);
    setLamp(id !== "threshold");
    currentId = id;
    remember(id);
    listen("REACHED", { ground:heldGroundIdFor(id), instrument:"ground", aperture:id });

    if (sameHeldGround && fromId !== id) {
      setChangePhysics("attention", `${heldGroundNameFor(id)} · story continues here`);
    } else if (fromId !== id) {
      setChangePhysics("movement", `${heldGroundNameFor(fromId)} → ${heldGroundNameFor(id)}`);
    } else {
      setChangePhysics("still", heldGroundNameFor(id));
    }

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

  function hintForCurrentGround() {
    const view = experienceShell?.dataset.view || "ground";
    if (view !== "ground") {
      if (view === "map") return "Try: “take me back to the ground” — or ask what one map relation means.";
      if (view === "people") return "Open one person, or ask: “why is this person reachable from here?”";
      if (view === "sources") return "Try: “what does this source actually establish?” — then return to the held ground.";
      if (view === "jacket") return "Ask about one open question, correction, or source road in this jacket.";
    }

    const hints = {
      report: "You can ask what this report is, or say “follow Dawson.”",
      night: "Try: “wait until morning,” or ask what the camp actually knows.",
      morning: "Try: “continue southeast,” or ask who is traveling here.",
      southeast: "Try: “follow Dawson,” “continue to Blue Water,” or ask “where can I go?”",
      "blue-water": "Ask what is happening at Blue Water, then try “what happened next?”",
      dozen: "Try: “what happened next?” or ask about the beaver count.",
      guide: "Ask about Mayes or Criner, then try “what happened next?”",
      "blue-water-mouth": "Try: “continue east,” or ask what the source does not establish here.",
      "east-blue-water": "You are at the current end of this public story reach. Try Map, People, Sources, or ask “where can I go?”"
    };
    return hints[currentId] || "Try asking what is strange here, where you are, or where you can go.";
  }

  function showGroundHint() {
    if (!groundHintCopy) return;
    const next = hintForCurrentGround();
    groundHintCopy.textContent = next;
    groundHintCopy.hidden = false;
    listen("REACHED", { ground:heldGroundIdFor(currentId), instrument:"hint", aperture:currentId });
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

    listen("ASKED_GROUND", { ground:heldGroundIdFor(currentId), instrument:experienceShell?.dataset.view||"ground", aperture:currentId });

    const origin = currentId;
    const heldView = experienceShell?.dataset.view || "ground";
    const thoughtTurn = !discoveryOpen && !thresholdThoughtGiven;

    if (asksForResetVisit(clean)) {
      resetVisit();
      return;
    }

    if (asksForFreshThread(clean)) {
      talkInput.value = "";
      sizeTalkInput();
      startFreshThread();
      return;
    }

    const whereCanIGo = /\b(where can i go|what can i visit|what places can i reach|where else can i go|how do i navigate)\b/i.test(clean);
    if (whereCanIGo && window.EarthlyHandsWayfinding) {
      keepTenWords(clean);
      talkInput.value = "";
      sizeTalkInput();
      if (groundThread) {
        const p = document.createElement("p");
        p.className = "ground-response";
        p.textContent = "You can ask to go to " + window.EarthlyHandsWayfinding.names().join(", ") + ". You can also type a known public path such as /recent.";
        groundThread.append(p);
      }
      return;
    }

    const publicGroundDoor = publicGroundFromWords(clean);

    if (publicGroundDoor) {
      keepTenWords(clean);
      talkInput.value = "";
      sizeTalkInput();
      window.location.assign(publicGroundDoor);
      return;
    }

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
    const transitionResolved = Boolean(localMove && canMove(origin, localMove));
    const relocationResolved = Boolean(
      transitionResolved &&
      heldGroundIdFor(origin) !== heldGroundIdFor(localMove)
    );
    if (!thoughtTurn) keepTenWords(clean);
    talkInput.value = "";
    sizeTalkInput();
    setAsking(true);

    if (transitionResolved) {
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
      "CONTINUITY: when Ten asks a fresh question without moving, make the current-ground continuity legible. Prefer words such as still / remain / same ground when accurate so a new answer does not look like a new historical movement. At Blue Water, a held or refusing answer may close with the local image that the ground remains while the creek continues past the map; use it only when it fits the turn, not as a required refrain.",
      "COMPOSITION: the title is an active part of the answer. Change it when the question genuinely changes the aperture or documentary job. A short answer may stay spare; a rich held answer may use several paragraphs and fill the available field. Do not pad for length.",
      "STATUS LABELING: when useful, say what kind of thing is being shown — direct source statement, attributed judgment/forecast, public derivative, unresolved edge, or reversible visitor experience. Do not blur those classes.",
      "HELD CONTEXT ONLY: use SOURCE FLOOR, CURRENT SCREEN, recent runtime conversation, and TEN. If they do not answer a factual historical question, say the held ground does not answer it. A visitor question addressed to the present interface voice (for example, 'do you like beavers?') is not a historical source question: answer without pretending the record has a preference, and do not invent a personal preference for the service.",
      "EXPERIENCE LAYER: Ten may make reversible present actions such as a small fire, coffee, sitting, waiting, looking, or darkness. Keep those distinct from the 1831 source.",
      relocationResolved
        ? "MOVEMENT: Ten already relocated once because this utterance clearly earned that crossing. Do not move again."
        : transitionResolved
          ? "HELD-GROUND APERTURE: the story advanced within the same physical ground. Do not narrate relocation. Keep the held place recognizable while attention, source depth, role, or uncertainty changes."
          : "MOVEMENT: remain here unless Ten explicitly asks to move. Topic words such as beaver, creek, trapping, Mayes, Criner, water, or weather are not movement commands.",
      "RETURN JSON ONLY with exactly these keys:",
      '{"setting":"ground/carrier line","title":"plain headline","view":"natural prose; blank lines allowed","footing":"Ten footing","companion":"optional public-ground footing","appearance":"","move_to":""}',
      'appearance must be "", "fire", "night", or "fire-night". move_to must be "" unless Ten explicitly advances or relocates; if used, choose only an id listed in ALLOWED STORY TRANSITIONS.',
      "Let the response change only what this turn earns. No change, refusal, or an unresolved edge is valid. Reconsider the title only when the page is genuinely doing something different.",
      "STATE SPLIT: CURRENT STORY APERTURE is sequence/attention. HELD GROUND is physical visitor footing. An aperture may advance while HELD GROUND remains unchanged.",
      `ALLOWED STORY TRANSITIONS: ${JSON.stringify(transitionResolved ? [] : (allowedMoves[currentId] || []))}`,
      `CURRENT STORY APERTURE: ${currentId}`,
      `HELD GROUND: ${heldGroundIdFor(currentId)}`,
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
          place: heldGroundIdFor(currentId),
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

        if (heldView !== "ground" && !transitionResolved && !(result.moveTo && canMove(patchOrigin, result.moveTo))) {
          const reply = shortState(patch.view || patch.title || patch.setting || "", 220);
          if (reply && groundThread) {
            const p = document.createElement("p");
            p.className = "ground-response";
            p.textContent = reply;
            groundThread.append(p);
          }
        }

        if (!transitionResolved && result.moveTo && canMove(patchOrigin, result.moveTo)) {
          landAt(result.moveTo);
        } else if (heldView !== "ground") {
          setDawsonView(heldView);
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

  groundHint?.addEventListener("click", showGroundHint);

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

    const fromId = currentId;
    const fromIndex = fullSequence.indexOf(fromId);
    const toIndex = fullSequence.indexOf(id);
    const direction = toIndex < fromIndex ? "back" : "forward";
    const sameHeldGround = heldGroundIdFor(fromId) === heldGroundIdFor(id);

    setLamp(id !== "threshold");
    currentId = id;
    remember(id);

    if (sameHeldGround && fromId !== id) {
      setChangePhysics("attention", `${heldGroundNameFor(id)} · story continues here`);
    } else if (fromId !== id) {
      setChangePhysics("movement", `${heldGroundNameFor(fromId)} → ${heldGroundNameFor(id)}`);
    } else {
      setChangePhysics("still", heldGroundNameFor(id));
    }

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
