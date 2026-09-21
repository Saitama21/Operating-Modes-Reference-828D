import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

const failures = [];
const passes = [];

function check(condition, message) {
  if (condition) passes.push(message);
  else failures.push(message);
}

function blocksFor(selector) {
  const escaped = selector.replace('.', '\\.');
  const re = new RegExp(escaped + '\\s*\\{([^{}]*)\\}', 'gs');
  return [...css.matchAll(re)].map(m => m[1]);
}

const dockBlocks = blocksFor('.dock');
const appShellBlocks = blocksFor('.app-shell');
const primaryDock = dockBlocks.find(b => /position\\s*:\\s*fixed\\s*;?/i.test(b)) || '';

check(dockBlocks.length > 0, 'dock selector exists');
check(/position\\s*:\\s*fixed\\s*;?/i.test(primaryDock), 'dock position = fixed');
check(/left\\s*:\\s*50%\\s*;?/i.test(primaryDock), 'dock left = 50%');
check(/transform\\s*:\\s*translateX\\(\\s*-50%\\s*\\)\\s*;?/i.test(primaryDock), 'dock centered with translateX(-50%)');
check(/bottom\\s*:\\s*var\\(\\s*--dock-bottom\\s*\\)\\s*;?/i.test(primaryDock), 'dock bottom uses --dock-bottom');
check(!/safe-area|env\\s*\\(/i.test(primaryDock), 'dock has no safe-area/env dependency');

check(
  !dockBlocks.some(b => /position\\s*:\\s*(absolute|sticky|relative)\\b/i.test(b)),
  'no dock override changes fixed positioning'
);

check(
  !dockBlocks.some(b => /bottom\\s*:[^;}]*safe-area/i.test(b)),
  'no dock bottom rule depends on safe-area'
);

const shell = appShellBlocks[0] || '';
check(appShellBlocks.length > 0, 'app-shell selector exists');
check(!/position\\s*:\\s*fixed\\b/i.test(shell), 'app-shell is not position: fixed');
check(/min-height\\s*:\\s*100dvh\\s*;?/i.test(shell), 'app-shell uses min-height: 100dvh');
check(/padding\\s*:[^;}]*--safe-bottom/i.test(shell), 'app-shell reserves safe-area only for content space');

check(/--dock-bottom\\s*:\\s*7px/i.test(css), 'default dock bottom token exists');
check(/--dock-width\\s*:\\s*95%/i.test(css), 'default dock width token exists');
check(/--dock-height\\s*:\\s*68px/i.test(css), 'default dock height token exists');

const phoneRule = /@media\\s*\\(min-width:\\s*390px\\)\\s*and\\s*\\(max-width:\\s*430px\\)\\s*\\{([\\s\\S]*?)\\n\\}/i.exec(css);
const phoneMedia = phoneRule ? phoneRule[1] : '';
check(/--dock-bottom\\s*:\\s*2px/i.test(phoneMedia), 'phone dock bottom = 2px');
check(/--dock-width\\s*:\\s*87%/i.test(phoneMedia), 'phone dock width = 87%');
check(/--dock-height\\s*:\\s*68px/i.test(phoneMedia), 'phone dock height = 68px');

const bannedRuntime = [
  ['visualViewport', /\\bvisualViewport\\b/],
  ['innerHeight', /\\binnerHeight\\b/],
  ['outerHeight', /\\bouterHeight\\b/],
  ['JS dock CSS variables', /--dock-(?:bottom|width|height)/]
];

for (const item of bannedRuntime) {
  check(!item[1].test(js), 'app.js does not depend on ' + item[0]);
}

console.log('\nUI CONTRACT — Bottom Dock\n');
for (const p of passes) console.log('PASS  ' + p);

if (failures.length) {
  console.error('\nFAILED UI CONTRACT:');
  for (const f of failures) console.error('FAIL  ' + f);
  console.error('\nRead UI_CONTRACT.md before changing viewport/dock geometry.');
  process.exit(1);
}

console.log('\nPASS  Dock contract is protected.\n');
