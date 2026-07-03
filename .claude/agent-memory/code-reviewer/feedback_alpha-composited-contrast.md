---
name: alpha-composited-contrast
description: Tailwind opacity modifiers (bg-clay/20) produce transparent backgrounds — composite against the actual parent colour before checking contrast
metadata:
  type: feedback
---

When a component uses a Tailwind opacity modifier (e.g., `bg-clay/20`, `bg-brand/10`), the element has no opaque background of its own. Contrast must be computed against the composited effective colour, not the base token.

**Why:** The M9 leech badge used `bg-clay/20 text-clay`. The clay colour at 20% opacity over the light-mode page background (#F5F3F0) produces an effective background of ~rgb(240,221,214). Clay text on that composited background is only 2.13:1 — far below both the 4.5:1 AA and 3:1 large-text thresholds. The implementer's WCAG table did not include this pairing at all, allowing a clear failure to ship.

**How to apply:**
- For any element with a `bg-*/N` class where N < 100, ask: what is the opaque ancestor background?
- Composite formula: effectiveChannel = baseChannel * (alpha/100) + parentChannel * (1 - alpha/100).
- Check both light and dark mode parents separately — the failure may be mode-specific (M9 leech badge failed light mode only, passed dark mode at 4.64:1).
- Treat badge/chip/status-pill elements as high-priority for this check because they are often small text on tinted backgrounds.

**Related:** [[wcag-contrast-verify]]
