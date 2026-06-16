import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

const sharedLayerForbiddenImports = [
  "../features/**",
  "../../features/**",
  "../../../features/**",
  "../../../../features/**",
  "**/features/**",
  "../app/**",
  "../../app/**",
  "../../../app/**",
  "../../../../app/**",
  "**/app/**"
];

const featureLayerForbiddenImports = [
  "../app/**",
  "../../app/**",
  "../../../app/**",
  "../../../../app/**",
  "**/app/**"
];

export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "react-refresh/only-export-components": "off",
      "react-hooks/set-state-in-effect": "off"
    }
  },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: sharedLayerForbiddenImports,
              message: "The shared layer must not depend on app or feature modules. Dependency direction: app -> features -> shared."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: featureLayerForbiddenImports,
              message: "Feature modules must not depend on the app composition layer. Dependency direction: app -> features -> shared."
            }
          ]
        }
      ]
    }
  }
);
