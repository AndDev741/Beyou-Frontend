/* Run: node functions/_middleware.test.mjs */
import { prefersPortuguese } from "./_middleware.js";

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

let bad = 0;
for (const [header, want] of cases) {
  const got = prefersPortuguese(header);
  if (got !== want) {
    console.error(`FAIL ${JSON.stringify(header)} -> ${got}, wanted ${want}`);
    bad++;
  }
}
console.log(bad ? `${bad} failing` : `${cases.length} cases pass`);
process.exit(bad ? 1 : 0);
