(() => {
  const scenes = Array.from(document.querySelectorAll("[data-room]"));
  const roomLinks = Array.from(document.querySelectorAll("[data-room-link]"));
  const where = document.querySelector("#where-label");
  const knownRooms = new Set(scenes.map((scene) => scene.dataset.room));

  function roomFromHash() {
    const room = window.location.hash.slice(1);
    return knownRooms.has(room) ? room : null;
  }

  function showRoom(room, moveFocus = true) {
    const next = scenes.find((scene) => scene.dataset.room === room) || scenes[0];

    scenes.forEach((scene) => {
      scene.classList.toggle("is-active", scene === next);
    });

    where.textContent = next.dataset.roomName;
    document.body.dataset.lamp = room === "threshold" ? "unlit" : "lit";

    if (moveFocus) {
      next.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  roomLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const room = link.dataset.roomLink;
      if (knownRooms.has(room)) showRoom(room);
    });
  });

  window.addEventListener("hashchange", () => {
    const room = roomFromHash();
    if (room) showRoom(room);
  });
  showRoom(roomFromHash() || "threshold", false);
})();
