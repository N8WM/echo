import js from "@eslint/js";
import typescriptEslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";

export default [
  js.configs.recommended,
  ...typescriptEslint.configs.recommended,
  stylistic.configs.customize({
    commaDangle: "never",
    indent: 2,
    quotes: "double",
    semi: true,
    arrowParens: true
  })
];
