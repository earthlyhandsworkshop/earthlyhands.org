(() => {
  const sourceUrl = "https://gateway.okhistory.org/ark:/67531/metadc2192269/";
  const sourceFamily =
    "Dawson report, 29 Jan. 1831 → Arkansas Advocate publication, Mar. 1831 → later printed representations. The original manuscript has not yet been recovered.";

  const windows = {
    distance: {
      kind: "Prose Map relation",
      title: "about fifteen miles southeast",
      near: "The report gives an approximate distance and direction between source states.",
      brake: "It does not preserve the traveled line or earn an exact starting point, modern road, or reconstructed route.",
      ask: "What does about fifteen miles southeast let us say, and what does it not let us draw?",
      cross: ["Follow the account to Blue Water", "blue-water"],
    },
    creek: {
      kind: "Prose Map relation",
      title: "this creek",
      near: "Inside the report, “this creek” points back to the immediately preceding small branch of Blue Water.",
      brake: "That earns source-local continuity, not an exact encounter point, bank, creek course, campsite merge, or modern creek identity.",
      ask: "What does this creek refer to here, and what remains geographically open?",
    },
    mayes: {
      kind: "Name Web occurrence",
      title: "Mr. Mayes",
      near: "A source-named person occurrence. Dawson reports finding Mayes here with Mr. Criner.",
      brake: "This is not a biography and does not silently join another Mayes. Encounter, residence, and trapping remain separate propositions.",
      ask: "Who is Mr. Mayes here, and what has the Workshop not joined to this occurrence?",
    },
    criner: {
      kind: "Name Web occurrence",
      title: "Mr. Criner",
      near: "A source-named person occurrence. Dawson reports finding Criner here with Mr. Mayes.",
      brake: "This is not a biography and does not silently join another Criner. Encounter, residence, and trapping remain separate propositions.",
      ask: "Who is Mr. Criner here, and what has the Workshop not joined to this occurrence?",
    },
    residence: {
      kind: "Name Web + Prose Map relation",
      title: "reside on James’ Fork of Poteau",
      near: "The report carries a residence relation from the Mayes and Criner occurrences to a source-named James’ Fork of Poteau reach.",
      brake: "Residence does not relocate the Blue Water encounter or earn a house point, parcel, ownership claim, exact bank, travel route, or modern hydrographic identity.",
      ask: "How is the James’ Fork residence relation different from the Blue Water encounter?",
    },
    trapping: {
      kind: "Source relation",
      title: "trapping for beaver here",
      near: "The report attaches this activity to the Blue Water encounter state.",
      brake: "It does not turn the trapping place into the residence place. The next statement gives one collective catch and does not divide it between Mayes and Criner.",
      ask: "What does trapping for beaver here establish about place, and what does it leave open?",
      cross: ["See the reported catch", "dozen"],
    },
  };

  let active = null;

  function closeWindow(restoreFocus = true) {
    if (!active) return;
    const { trigger, panel } = active;
    panel.remove();
    trigger.setAttribute("aria-expanded", "false");
    active = null;
    if (restoreFocus) trigger.focus();
  }

  function action(label, run) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", run);
    return button;
  }

  function openWindow(trigger, key) {
    const data = windows[key];
    if (!data) return;
    if (active?.trigger === trigger) return closeWindow();
    closeWindow(false);

    const panel = document.createElement("section");
    panel.className = "relation-window";
    panel.id = `relation-window-${key}`;
    panel.setAttribute("aria-label", `${data.title} context`);

    const head = document.createElement("div");
    head.className = "relation-window-head";
    const label = document.createElement("div");
    label.innerHTML = '<p class="relation-window-kind"></p><h3 class="relation-window-title"></h3>';
    label.querySelector("p").textContent = data.kind;
    label.querySelector("h3").textContent = data.title;
    const close = action("×", () => closeWindow());
    close.className = "relation-window-close";
    close.setAttribute("aria-label", "Close and stay here");
    head.append(label, close);

    const near = document.createElement("p");
    near.className = "relation-window-near";
    near.textContent = data.near;
    const brake = document.createElement("p");
    brake.className = "relation-window-brake";
    brake.textContent = data.brake;

    const source = document.createElement("details");
    source.className = "relation-source";
    source.innerHTML = '<summary>Go closer to the source</summary><p></p><a target="_blank" rel="noopener noreferrer">Open the public Dawson representation ↗</a>';
    source.querySelector("p").textContent = sourceFamily;
    source.querySelector("a").href = sourceUrl;

    const actions = document.createElement("div");
    actions.className = "relation-window-actions";
    if (data.cross) {
      actions.append(action(data.cross[0], () => {
        closeWindow(false);
        document.querySelector(`[data-reveal="${data.cross[1]}"]`)?.click();
      }));
    }
    actions.append(
      action("Ask from here", () => {
        closeWindow(false);
        const prompt = Array.from(document.querySelectorAll("[data-prompt]"))
          .find((button) => button.dataset.prompt === data.ask);
        if (prompt) {
          prompt.click();
          return;
        }
        const toggle = document.querySelector("#talk-toggle");
        const input = document.querySelector("#talk-input");
        if (toggle && input) {
          if (document.querySelector("#talk-body")?.hidden) toggle.click();
          input.value = data.ask;
          document.querySelector("#talk-form")?.requestSubmit();
        }
      }),
      action("Close and stay here", () => closeWindow()),
    );

    panel.append(head, near, brake, source, actions);
    trigger.closest("p")?.insertAdjacentElement("afterend", panel);
    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute("aria-controls", panel.id);
    active = { trigger, panel };
    close.focus();
  }

  function inline(text, key) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "inline-relation";
    button.textContent = text;
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => openWindow(button, key));
    return button;
  }

  function rewrite(paragraph, ...parts) {
    if (!paragraph) return;
    paragraph.replaceChildren(...parts.map((part) =>
      typeof part === "string" ? document.createTextNode(part) : part,
    ));
  }

  rewrite(
    document.querySelector("#southeast .first-person-view p:first-child"),
    "The report carries ", inline("about fifteen miles southeast", "distance"), " toward the next camp.",
  );

  const blue = document.querySelectorAll("#blue-water .first-person-view p");
  rewrite(
    blue[0], "On ", inline("this creek", "creek"), ", Dawson reports finding ",
    inline("Mr. Mayes", "mayes"), " and ", inline("Mr. Criner", "criner"), ".",
  );
  rewrite(blue[1], "They ", inline("reside on James’ Fork of Poteau", "residence"), ".");
  rewrite(
    blue[2], "They are ", inline("trapping for beaver here", "trapping"),
    ". The report supplies no route between the creek and their residence.",
  );

  document.querySelector("main")?.addEventListener("scroll", () => closeWindow(false), { passive: true });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && active) closeWindow();
  });
})();
