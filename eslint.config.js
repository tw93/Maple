import globals from "globals";

export default [
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2020,
        ...globals.node,
        chrome: "readonly",
        Fuse: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-useless-escape": "off",
      "no-undef": "off",
    },
  },
];
