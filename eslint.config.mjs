import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  globalIgnores([
    "dist/**",
    ".next/**",
    "node_modules/**",
  ]),
]);

export default eslintConfig;
