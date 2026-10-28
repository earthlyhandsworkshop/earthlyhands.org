// Isolated simulated DOM checks for the fictional Pocket Workshop interface.
// No network, browser storage, real identity, or Workshop source is used.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script, createContext, runInContext } from "node:vm";
import test from "node:test";

const page = readFileSync(new URL("./pocket-workshop.html", import.meta.url), "utf8");
const inline = page.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline, "expected the fictional Pocket Workshop inline script");

function pocket() {
  const listeners = new Map();
  const main = { innerHTML: "" };
  const nav = ["workshop", "folio", "bench", "search", "bello"].map(go => ({
    dataset: { go },
    setAttribute() {},
    removeAttribute() {}
  }));
  const document = {
    getElementById(id) {
      if (id === "main") return main;
      if (id === "results") return { innerHTML: "" };
      throw new Error("Unexpected DOM element: " + id);
    },
    querySelectorAll(selector) {
      assert.equal(selector, "nav button");
      return nav;
    },
    addEventListener(type, handler) { listeners.set(type, handler); }
  };
  const context = createContext({ document, window: { scrollTo() {} } });
  new Script(inline, { filename: "pocket-workshop-inline.js" }).runInContext(context);
  function navigate(destination) { runInContext("show(" + JSON.stringify(destination) + ")", context); }
  function folio(action) {
    assert.ok(["open", "close"].includes(action));
    listeners.get("click")({
      target: {
        id: "",
        closest(selector) {
          if (selector === "[data-go]") return null;
          if (selector === "[data-folio]") return { dataset: { folio: action } };
          return null;
        }
      }
    });
  }
  return { main, navigate, folio };
}

test("folio box rests in the alcove until called, with no mandatory possession", () => {
  const p = pocket();
  p.navigate("folio");
  assert.match(p.main.innerHTML, /Folio box at rest/);
  assert.match(p.main.innerHTML, /Call for my folio box/);
  assert.match(p.main.innerHTML, /No visitor is required to have a box/);
  assert.doesNotMatch(p.main.innerHTML, /Chosen leaves/);
  assert.doesNotMatch(page.toLowerCase(), /backpack/);
});

test("calling, closing, and calling again preserve the same fictional working leaf", () => {
  const p = pocket();
  p.navigate("folio");
  p.folio("open");
  assert.match(p.main.innerHTML, /Chosen leaves/);
  assert.match(p.main.innerHTML, /fiction:001/);
  assert.match(p.main.innerHTML, /Close and return to alcove/);
  p.folio("close");
  assert.match(p.main.innerHTML, /Folio box at rest/);
  assert.doesNotMatch(p.main.innerHTML, /Chosen leaves/);
  p.folio("open");
  assert.match(p.main.innerHTML, /fiction:001/);
});

test("the open leaf returns to the folio rather than dumping its hand in search", () => {
  const p = pocket();
  p.navigate("folio");
  p.folio("open");
  p.navigate("detail:fiction:001");
  assert.match(p.main.innerHTML, /Return to open folio box/);
  p.navigate("folio");
  assert.match(p.main.innerHTML, /Chosen leaves/);
});

test("leaving the folio dismisses its view; it does not follow to other grounds", () => {
  const p = pocket();
  p.navigate("folio");
  p.folio("open");
  p.navigate("bench");
  assert.doesNotMatch(p.main.innerHTML, /Chosen leaves/);
  p.navigate("folio");
  assert.match(p.main.innerHTML, /Folio box at rest/);
  assert.doesNotMatch(p.main.innerHTML, /Chosen leaves/);
});

test("search detail does not summon an unopened private folio", () => {
  const p = pocket();
  p.navigate("search");
  p.navigate("detail:fiction:001");
  assert.match(p.main.innerHTML, /Return to search/);
  assert.doesNotMatch(p.main.innerHTML, /Return to open folio box/);
});

test("the specimen still claims no account, live storage, or delivered invitation", () => {
  assert.match(page, /Nothing is saved or sent/);
  assert.match(page, /Fictional records only/);
  assert.doesNotMatch(page, /fetch\s*\(/);
});
