import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "eslint-plugin-next";

// Flat config is intentionally minimal to stay stable with the installed toolchain.
// CI can still enforce stronger rules by extending this baseline later.
export default defineConfig([
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    plugins: {
      next: nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
    },
  },
]);
