/* Run: node functions/_middleware.test.mjs */
import { prefersPortuguese, counterpart } from "./_middleware.js";

const cases = [
  ["pt-BR,pt;q=0.9,en;q=0.8", true],
  ["pt-PT", true],
  ["en-US,en;q=0.9", false],
  ["en;q=0.4, pt-BR;q=0.9", true],   // Portuguese wins on q, not on order
  ["fr-FR,fr;q=0.9", false],
  ["fr,pt;q=0.5", true],             // no English at all, Portuguese present
  ["", false],
  [null, false],
  ["*", false],
];

// Switching language keeps you on the page you were reading. The store listing
// links straight at /privacy/, so sending that visitor to the home page would
// lose the one document they came for.
const paths = [
  ["/", "pt", "/pt/"],
  ["/", "en", "/"],
  ["/pt/", "en", "/"],
  ["/privacy/", "pt", "/pt/privacidade/"],
  ["/pt/privacidade/", "en", "/privacy/"],
  ["/privacy/", "en", "/privacy/"],
  ["/privacy", "pt", "/pt/privacidade/"],   // no trailing slash
  ["/nothing-here/", "pt", "/pt/"],         // unknown path falls back home
];

let bad = 0;
for (const [header, want] of cases) {
  const got = prefersPortuguese(header);
  if (got !== want) {
    console.error(`FAIL ${JSON.stringify(header)} -> ${got}, wanted ${want}`);
    bad++;
  }
}
for (const [path, lang, want] of paths) {
  const got = counterpart(path, lang);
  if (got !== want) {
    console.error(`FAIL counterpart(${path}, ${lang}) -> ${got}, wanted ${want}`);
    bad++;
  }
}
const total = cases.length + paths.length;
console.log(bad ? `${bad} failing` : `${total} cases pass`);
process.exit(bad ? 1 : 0);
