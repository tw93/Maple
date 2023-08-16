module.exports = {
  parserOptions: {
    ecmaVersion: 2020, // 改为ES2020
    sourceType: "module",
  },
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: ["eslint:recommended", "plugin:prettier/recommended", "plugin:import/errors", "plugin:import/warnings"],
  plugins: ["prettier", "import"],
  rules: {
    "prettier/prettier": "error",
    "no-useless-escape": "off",
    "no-undef": "off",
  },
};
