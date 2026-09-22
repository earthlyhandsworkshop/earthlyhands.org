const lanternButton = document.getElementById("lanternButton");
const lanternStatus = document.getElementById("lanternStatus");

lanternButton.addEventListener("click", () => {
  const lit = document.body.classList.toggle("lantern-lit");

  lanternButton.textContent = lit ? "Extinguish the lantern" : "Light the lantern";
  lanternStatus.textContent = lit
    ? "The lantern is lit. Nothing else has changed."
    : "The lantern is unlit.";
});
