# UI Contract — Bottom Dock

This file is a **release contract**, not a design suggestion.

The bottom dock must behave like the working dock in `Beta-test-`: it belongs to the browser/app viewport and is independent from Safari toolbar geometry.

## Mandatory rules

1. Dock positioning:
   - `position: fixed`
   - `left: 50%`
   - `transform: translateX(-50%)`
   - `bottom: var(--dock-bottom)`
   - mobile calibration: `--dock-bottom: 2px`, `--dock-width: 87%`, `--dock-height: 68px` for 390–430 px phone-class width.

2. The dock MUST NOT use:
   - `env(safe-area-inset-bottom)`
   - `visualViewport`
   - `innerHeight`
   - `outerHeight`
   - JavaScript-calculated bottom offsets
   - positioning relative to `.app-shell`, `.viewport`, Safari toolbar, browser controls, or dynamic viewport measurements.

3. Safe area:
   - `safe-area-inset-bottom` is allowed only to reserve content space below/behind content.
   - It must never move the dock.

4. App shell:
   - stays in normal document flow;
   - must not be `position: fixed`;
   - uses `min-height: 100dvh`;
   - reserves bottom space for the dock.

5. Before every release:
   - run `npm run test:ui`;
   - a failing UI contract test blocks the change;
   - manually verify Safari with its bottom toolbar shown, hidden, and shown again. The dock must keep its own fixed bottom offset.

## Canonical dock pattern

```css
.dock {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: var(--dock-bottom);
  width: min(var(--dock-width), 640px);
  height: var(--dock-height);
}
```

The automated test in `tests/ui-contract.mjs` protects these invariants.
