import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // M12: the plain ".next/**" pattern above only matches a top-level
    // .next dir, not one nested inside a git worktree checkout (e.g.
    // .claude/worktrees/<branch>/.next/**) — without this, `npm run lint`
    // picks up that worktree's own build output (a different branch's
    // compiled Turbopack chunks) as if it were part of this source tree.
    // Pre-existing gap, unrelated to the M12 feature itself; fixed here
    // because it otherwise makes the A6 lint gate meaningless.
    "**/.next/**",
    ".artifacts/**",
  ]),
]);

export default eslintConfig;
