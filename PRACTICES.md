# Practices

This template repository comes with a number of best practices set up and configured so you could focus on working on your next awesome library. Below you can find the full list of features provided by this template.

## Linting

- Uses `eslint` recommended configuration with TypeScript.
- Uses `eslint-plugin-jest` for linting test suites.

## Productivity

- Comes with a pre-configured CI pipeline (GitHub Actions).
- Lints all staged files for commit via `husky` and `lint-staged`, preventing statically checked mistakes to be committed in the first place.
- Configured import aliases (`compilerOptions.paths`) for shorter modules references during development and testing.

## Community

- Includes a README template.
- Includes detailed Contributing guidelines.
- Includes a basic set of issues templates (GitHub).

## Distribution

- Distributes the library in three formats: UMD, ESM, CommonJS.
- Configures the bundler for a tree-shackable output.
- Configures the publishing pipeline (`publishOnly`).
