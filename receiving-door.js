(() => {
  if (window.EarthlyHandsReceivingDoor) return;

  function ensureConfig() {
    if (String(window.EARTHLY_HANDS_RECEIVING_URL || "").trim()) return Promise.resolve();
    if (document.querySelector('script[data-earthly-hands-config]')) {
      return new Promise(resolve => setTimeout(resolve, 50));
    }
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "/config.js";
      script.dataset.earthlyHandsConfig = "1";
      script.onload = resolve;
      script.onerror = resolve;
      document.head.append(script);
    });
  }

  const style = document.createElement("style");
  style.textContent = `
  .eh-receive-door{
    position:fixed;right:.45rem;top:50%;z-index:80;transform:translateY(-50%);
    writing-mode:vertical-rl;appearance:none;border:1px solid rgba(33,30,24,.42);
    border-right:0;background:#e8e0d0;color:#211e18;padding:.68rem .36rem;
    font:700 .47rem/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    letter-spacing:.09em;text-transform:uppercase;cursor:pointer
  }
  .eh-receive-door:hover{background:#f0e9dc}
  .eh-receive-overlay{position:fixed;inset:0;z-index:100;background:#ddd3bf;color:#211e18;display:none;overflow:auto}
  .eh-receive-overlay.open{display:block}
  .eh-receive-shell{width:min(78rem,calc(100% - 1rem));margin:auto;padding:.6rem 0 3rem}
  .eh-receive-head{min-height:3rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;border-bottom:1px solid #4d473d;font:700 .57rem/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase}
  .eh-receive-close{border:0;border-bottom:1px solid #86553a;background:transparent;padding:.15rem 0;cursor:pointer;font:inherit}
  .eh-receive-title{padding:clamp(2rem,7vw,5rem) 0 2rem;border-bottom:1px solid #4d473d}
  .eh-receive-title p{margin:0 0 .4rem;color:#71695b;font:700 .52rem/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase}
  .eh-receive-title h2{margin:0;max-width:15ch;font:400 clamp(2.8rem,7vw,6rem)/.88 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;letter-spacing:-.055em}
  .eh-receive-title .sub{margin:1rem 0 0;max-width:43rem;color:#71695b;font:1rem/1.45 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
  .eh-receive-form{display:grid;grid-template-columns:1fr 1fr;border-left:1px solid #4d473d}
  .eh-receive-field{padding:1rem;border-right:1px solid #4d473d;border-bottom:1px solid #4d473d}
  .eh-receive-field.full{grid-column:1/-1}
  .eh-receive-field label,.eh-receive-field .label{display:block;margin-bottom:.5rem;color:#71695b;font:700 .5rem/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.07em;text-transform:uppercase}
  .eh-receive-field input[type="text"],.eh-receive-field input[type="email"],.eh-receive-field textarea{width:100%;border:0;border-bottom:1px solid rgba(33,30,24,.35);background:transparent;padding:.45rem .1rem;color:#211e18;font:1rem/1.35 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;outline:none}
  .eh-receive-field textarea{min-height:6rem;resize:vertical}
  .eh-file-button,.eh-send{appearance:none;border:1px solid #4d473d;background:transparent;color:#211e18;padding:.7rem .8rem;cursor:pointer}
  .eh-file-button:hover,.eh-send:hover{background:rgba(255,255,255,.2)}
  .eh-file-name,.eh-receive-status{display:block;margin-top:.5rem;color:#71695b;font:.55rem/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
  .eh-receive-actions{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem;border-right:1px solid #4d473d;border-bottom:1px solid #4d473d}
  .eh-receive-context{color:#71695b;font:.55rem/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
  @media(max-width:44rem){
    .eh-receive-door{right:0}
    .eh-receive-form{grid-template-columns:1fr}
    .eh-receive-field.full{grid-column:auto}
    .eh-receive-title h2{font-size:3.3rem}
    .eh-receive-actions{align-items:flex-start;flex-direction:column}
  }`;
  document.head.append(style);

  const door = document.createElement("button");
  door.type = "button";
  door.className = "eh-receive-door";
  door.textContent = "Receive";
  door.setAttribute("aria-haspopup", "dialog");
  door.setAttribute("aria-expanded", "false");

  const overlay = document.createElement("section");
  overlay.className = "eh-receive-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Send a record to Earthly Hands Workshop");
  overlay.innerHTML = `
    <div class="eh-receive-shell">
      <header class="eh-receive-head">
        <strong>Earthly Hands · Receiving</strong>
        <button class="eh-receive-close" type="button">Return to folio</button>
      </header>
      <div class="eh-receive-title">
        <p>Standing receiving door</p>
        <h2>Bring the thing. We’ll find its ground.</h2>
        <p class="sub">You do not need to decide where a file belongs before sending it. Receiving preserves the original privately, carries this folio as context, and leaves classification for the Workshop.</p>
      </div>
      <form class="eh-receive-form">
        <input class="eh-file" name="file" type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.txt" required hidden>
        <div class="eh-receive-field full">
          <span class="label">File</span>
          <button class="eh-file-button" type="button">Choose a file</button>
          <span class="eh-file-name">No file selected.</span>
        </div>
        <div class="eh-receive-field">
          <label>What is this? · optional</label>
          <textarea name="description" maxlength="2000" placeholder="One sentence is enough."></textarea>
        </div>
        <div class="eh-receive-field">
          <label>Where did it come from? · optional</label>
          <textarea name="provenance" maxlength="2000" placeholder="Archive, family papers, courthouse, download, photograph…"></textarea>
        </div>
        <div class="eh-receive-field">
          <label>Your name · optional</label>
          <input name="contributor_name" type="text" maxlength="200">
        </div>
        <div class="eh-receive-field">
          <label>Email · optional</label>
          <input name="contributor_email" type="email" maxlength="320">
        </div>
        <div class="eh-receive-actions full">
          <div>
            <div class="eh-receive-context"></div>
            <span class="eh-receive-status">Original preserved privately · received ≠ published.</span>
          </div>
          <button class="eh-send" type="submit">Send to Receiving</button>
        </div>
      </form>
    </div>`;

  document.body.append(door, overlay);

  const close = overlay.querySelector(".eh-receive-close");
  const form = overlay.querySelector(".eh-receive-form");
  const file = overlay.querySelector(".eh-file");
  const fileButton = overlay.querySelector(".eh-file-button");
  const fileName = overlay.querySelector(".eh-file-name");
  const status = overlay.querySelector(".eh-receive-status");
  const context = overlay.querySelector(".eh-receive-context");
  const send = overlay.querySelector(".eh-send");

  function contextValues() {
    const objectId = document.body.dataset.receivingObject || document.documentElement.dataset.workshopObject || "";
    const target = document.body.dataset.receivingTarget || document.title || "Workshop";
    return { objectId, target };
  }

  function syncContext() {
    const { objectId, target } = contextValues();
    context.textContent = [target, objectId].filter(Boolean).join(" · ");
  }

  function open() {
    syncContext();
    overlay.classList.add("open");
    door.setAttribute("aria-expanded", "true");
    document.documentElement.style.overflow = "hidden";
    close.focus();
  }

  function shut() {
    overlay.classList.remove("open");
    door.setAttribute("aria-expanded", "false");
    document.documentElement.style.overflow = "";
    door.focus();
  }

  door.addEventListener("click", open);
  close.addEventListener("click", shut);
  overlay.addEventListener("click", (event) => { if (event.target === overlay) shut(); });
  window.addEventListener("keydown", (event) => { if (event.key === "Escape" && overlay.classList.contains("open")) shut(); });
  fileButton.addEventListener("click", () => file.click());
  file.addEventListener("change", () => { fileName.textContent = file.files?.[0]?.name || "No file selected."; });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!file.files?.length) { status.textContent = "Choose a file first."; return; }
    await ensureConfig();
    const endpoint = String(window.EARTHLY_HANDS_RECEIVING_URL || "").trim();
    if (!endpoint) { status.textContent = "Receiving is not configured."; return; }

    const { objectId, target } = contextValues();
    const data = new FormData(form);
    const note = String(data.get("description") || "").trim();
    data.set("description", [
      "FOLIO RECEIVING",
      "Standing in: " + target,
      objectId ? "Workshop object: " + objectId : "",
      note ? "Contributor note: " + note : ""
    ].filter(Boolean).join("\n"));

    send.disabled = true;
    status.textContent = "Receiving…";
    try {
      const response = await fetch(endpoint, { method: "POST", body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || ("HTTP " + response.status));
      status.textContent = "RECEIVED · " + (result.receipt || "held for review") + " · Original preserved privately.";
      form.reset();
      fileName.textContent = "No file selected.";
    } catch (error) {
      status.textContent = "Not received · " + error.message;
    } finally {
      send.disabled = false;
    }
  });

  window.EarthlyHandsReceivingDoor = Object.freeze({ open, close: shut, syncContext });
})();