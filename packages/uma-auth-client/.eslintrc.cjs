const commentOptions = {
  mode: "overflow-only",
  maxLength: 100,
  ignoreUrls: true,
  ignoreCommentsWithCode: true,
  tabSize: 2,
};

module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react/jsx-no-target-blank': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],

    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-floating-promises": "off",
    "@typescript-eslint/no-misused-promises": "off",
    "@typescript-eslint/no-unsafe-argument": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-call": "off",
  },
  overrides: [
    {
      /* All Typescript files, including tests and files outside src: */
      files: ["**/*.ts?(x)"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:comment-length/recommended",
      ],
      parser: "@typescript-eslint/parser",
      rules: {
        /* TypeScript's `noFallthroughCasesInSwitch` option is more robust */
        "default-case": "off",
        /* tsc already handles this */
        "no-dupe-class-members": "off",
        /* tsc already handles this */
        "no-undef": "off",
        /* Add TypeScript specific rules (and turn off ESLint equivalents) */
        "@typescript-eslint/consistent-type-imports": [
          "error",
          {
            /* Allow dynamic import() type refs: */
            disallowTypeAnnotations: false,
            fixStyle: "inline-type-imports",
          },
        ],
        "@typescript-eslint/consistent-type-assertions": [
          "error",
          { assertionStyle: "as" },
        ],
        "no-use-before-define": "off",
        "@typescript-eslint/no-use-before-define": [
          "error",
          {
            functions: false,
            classes: false,
            variables: false,
            typedefs: false,
          },
        ],
        "no-unused-expressions": "off",
        "@typescript-eslint/no-unused-expressions": [
          "error",
          {
            allowShortCircuit: true,
            allowTernary: true,
            allowTaggedTemplates: true,
          },
        ],
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            args: "none",
            ignoreRestSiblings: true,
          },
        ],
        "no-array-constructor": "off",
        "@typescript-eslint/no-array-constructor": "warn",
        "@typescript-eslint/no-namespace": "off",
        "@typescript-eslint/no-explicit-any": "off",

        /* Other overrides */
        "no-extra-boolean-cast": "off",
        "comment-length/limit-single-line-comments": ["error", commentOptions],
        "comment-length/limit-multi-line-comments": ["error", commentOptions],
        "comment-length/limit-multi-line-comments": [
          "error",
          {
            tags: ["css"],
            ...commentOptions,
          },
        ],
      },
    },
    {
      /* Javascript files outside `src` directory, presumed to be Node.js config or scripts */
      files: ["**/*.?(m|c)js?(x)"],
      excludedFiles: ["**/src/**/*"],
      env: {
        node: true,
      },
      extends: ["eslint:recommended"],
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  ],
}
