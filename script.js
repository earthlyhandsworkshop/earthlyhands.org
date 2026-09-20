(() => {
  const lamp = document.querySelector("#lamp-control");
  const lampLabel = lamp.querySelector(".lamp-label");
  const where = document.querySelector("#where-label");
  const steps = Array.from(document.querySelectorAll("[data-step]"));
  const sequence = ["report", "night", "morning", "southeast", "blue-water", "dozen"];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setLamp(isLit) {
    document.body.dataset.lamp = isLit ? "lit" : "unlit";
    lamp.setAttribute("aria-pressed", String(isLit));
    lampLabel.textContent = isLit ? "Extinguish the lantern" : "Light the lantern";
  }

  function moveTo(target) {
    where.textContent = target.dataset.place || "Workshop";
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  function reveal(id, move = true) {
    const target = document.getElementById(id);
    if (!target) return;

    target.classList.add("is-revealed");
    if (move) {
      history.pushState(null, "", `#${id}`);
      requestAnimationFrame(() => moveTo(target));
    }
  }

  function revealThrough(id) {
    const index = sequence.indexOf(id);
    if (index < 0) return false;
    sequence.slice(0, index + 1).forEach((stepId) => reveal(stepId, false));
    setLamp(true);
    return true;
  }

  lamp.addEventListener("click", () => {
    const isLit = document.body.dataset.lamp !== "lit";
    setLamp(isLit);

    if (isLit && !document.querySelector("#report").classList.contains("is-revealed")) {
      reveal("report");
    }
  });

  document.querySelectorAll("[data-reveal]").forEach((control) => {
    control.addEventListener("click", () => reveal(control.dataset.reveal));
  });

  document.querySelectorAll("[data-scroll]").forEach((control) => {
    control.addEventListener("click", () => {
      const target = document.getElementById(control.dataset.scroll);
      if (!target) return;
      history.pushState(null, "", `#${target.id}`);
      moveTo(target);
    });
  });

  window.addEventListener("popstate", () => {
    const target = document.getElementById(window.location.hash.slice(1));
    if (target) moveTo(target);
  });

  const initialId = window.location.hash.slice(1);
  if (revealThrough(initialId)) {
    const initialTarget = document.getElementById(initialId);
    if (initialTarget) where.textContent = initialTarget.dataset.place || "Workshop";
  } else if (initialId === "practice") {
    where.textContent = "Below the threshold";
  }

  steps.forEach((step) => {
    step.setAttribute("aria-live", "polite");
  });
})();
