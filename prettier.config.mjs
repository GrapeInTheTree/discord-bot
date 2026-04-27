/** @type {import("prettier").Config} */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'always',
  bracketSameLine: false,
  endOfLine: 'lf',
  proseWrap: 'preserve',
  overrides: [
    {
      files: '*.md',
      options: { printWidth: 80 },
    },
    {
      files: ['*.yml', '*.yaml'],
      options: { singleQuote: false },
    },
  ],
};
