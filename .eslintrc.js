module.exports = {
    parser: '@typescript-eslint/parser', // Set TypeScript parser
    extends: [
      'eslint:recommended',  // Extends basic ESLint recommended rules
      'plugin:@typescript-eslint/recommended',  // Extends recommended rules for TypeScript
    ],
    parserOptions: {
      ecmaVersion: 2020, // JavaScript version to support
      sourceType: 'module', // Set the module type
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',  // Disable unused variables rule
    },
  };
  