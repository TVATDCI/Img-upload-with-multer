import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    ignores: ["node_modules/**", "dist/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
    },
  },
  eslintConfigPrettier,
];
