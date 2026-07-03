---
name: wcag-contrast-verify
description: Always independently recompute WCAG contrast ratios; handoff tables frequently contain arithmetic errors that mask real AA failures
metadata:
  type: feedback
---

Always recompute WCAG 2.1 contrast ratios from first principles using the correct sRGB gamma linearisation formula. Do not trust values recorded in handoff tables.

**Why:** In the M9 review, the implementer claimed white on `#1F8A4C` (success green) yielded 5.3:1 (WCAG AA PASS). The correct value is 4.38:1 (WCAG AA FAIL). The error was 0.92 ratio points — enough to flip a failure into a pass. The formula error appears to have come from skipping the gamma expansion step or using a wrong green hex during calculation then switching the actual hex without rechecking.

**How to apply:**
- Use `sRGBtoLin(c) = c <= 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4` for each channel (c = byte/255).
- Luminance = 0.2126*Rlin + 0.7152*Glin + 0.0722*Blin.
- Contrast = (max(L1,L2) + 0.05) / (min(L1,L2) + 0.05).
- Prioritise recomputing any pairing the implementer marks as "borderline" (ratio < 5.5:1 for text, < 3.5:1 for UI) and all newly introduced pairings not present in a prior review.
- Also check alpha-composited colours (e.g., `bg-clay/20`): composite against the actual page or surface colour before computing contrast. A pairing that looks fine in isolation can fail badly once the transparent layer is resolved.
- Remember: WCAG large text exemption (3:1 threshold) requires 18pt (24px) at normal weight OR 14pt (18.67px) at bold. Most UI button labels at `text-sm` (14px/10.5pt) do NOT qualify as large text even when bold.
