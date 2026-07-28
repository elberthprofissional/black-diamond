// ESLint configuration for Black Diamond project
module.exports = {
  env: {
    browser: true,
    es2023: true,
    node: true,
    jest: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:security/recommended",
    "plugin:prettier/recommended",
  ],
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: "detect" },
  },
  plugins: ["react", "react-hooks", "security"],
  rules: {
    // You can customize rules here
    "no-console": "warn",
    "react/prop-types": "off",
    "security/detect-object-injection": "error",
  },
};
