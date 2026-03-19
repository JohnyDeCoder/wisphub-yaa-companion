import js from "@eslint/js";
import globals from "globals";
import boundaries from "eslint-plugin-boundaries";

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "example/**",
      "scripts/**",
      "webpack.config.js",
    ],
  },
  {
    files: ["*.config.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
  },
  js.configs.recommended,
  {
    plugins: { boundaries },
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        CKEDITOR: "readonly",
        chrome: "readonly",
        browser: "readonly",
      },
    },
    settings: {
      "boundaries/elements": [
        { type: "config", pattern: "src/config/*" },
        { type: "utils", pattern: "src/utils/*" },
        { type: "lib", pattern: "src/lib/**/*" },
        { type: "features", pattern: "src/features/**/*" },
        { type: "app", pattern: "src/app/**/*" },
        { type: "styles", pattern: "src/styles/*" },
      ],
      "boundaries/dependency-nodes": ["import"],
    },
    rules: {
      semi: ["error", "always"],
      "brace-style": ["error", "1tbs", { allowSingleLine: true }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "max-len": ["warn", { code: 120, tabWidth: 2, ignoreUrls: true }],
      "no-unused-vars": ["warn"],
      "no-console": "off",
      indent: ["error", 2],
      "comma-dangle": ["error", "always-multiline"],
      curly: ["error", "all"],
      "no-var": "error",
      "prefer-const": "error",

      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          rules: [
            {
              from: { type: "utils" },
              allow: { to: { type: "config" } },
            },
            {
              from: { type: "lib" },
              allow: { to: { type: ["config", "utils"] } },
            },
            {
              from: { type: "features" },
              allow: { to: { type: ["config", "utils", "lib"] } },
            },
            {
              from: { type: "app" },
              allow: { to: { type: ["config", "utils", "lib", "features"] } },
            },
          ],
        },
      ],
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
    rules: {
      "max-len": "off",
      "boundaries/dependencies": "off",
    },
  },
];
