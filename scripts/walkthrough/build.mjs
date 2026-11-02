// `npm run walkthrough`: voice -> slides -> live demo recording -> assemble + captions + timing check.
// Run a single stage with: npm run walkthrough -- voice|slides|record|assemble
import { assemble } from "./assemble.mjs";
import { record } from "./record.mjs";
import { slides } from "./slides.mjs";
import { voice } from "./voice.mjs";

const only = process.argv[2];
const stages = { voice, slides, record, assemble };
if (only && !stages[only]) throw new Error(`Unknown stage "${only}". Use one of: ${Object.keys(stages).join(", ")}`);
for (const [name, fn] of Object.entries(stages)) {
  if (only && only !== name) continue;
  console.log(`\n== ${name} ==`);
  await fn();
}
