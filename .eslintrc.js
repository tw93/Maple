module.exports = {
  parserOptions: {
    ecmaVersion: 2018, // ES9
    sourceType: "module",
  },
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:prettier/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
  ],
  plugins: ["prettier", "import"],
  rules: {
    "prettier/prettier": [
      "error",
      {
        tabWidth: 2,
      },
    ],
  },
};
