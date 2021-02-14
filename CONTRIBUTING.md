# Contributing

Thank you for considering contributing to this library! Below you can find the instructions on the development process, as well as testing and publishing guidelines. Don't hesitate to reach out to the library maintainers in the case of questions.

## Pre-requisites

- [Yarn](https://classic.yarnpkg.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Jest](https://jestjs.io/)

## Git workflow

```bash
$ git checkout -b <FEATURE>
$ git add .
$ git commit -m 'Adds contribution guidelines'
$ git push -u origin <FEATURE>
```

Ensure that your feature branch is up-to-date with the latest `main` before assigning it for code review:

```bash
$ git checkout master
$ git pull --rebase
$ git checkout <FEATURE>
$ git rebase master
```

Once your changes are ready, open a Pull request and assign one of the library maintainers as a reviewer. We will go through your changes and ensure they land in the next release.

## Develop

```bash
$ yarn start
```

## Test

### Run all tests

```bash
$ yarn test
```

### Run a single test

```bash
$ yarn test test/add.test.ts
```

## Publish

Follow this instructions to publish the library:

1. Log in with your [NPM](http://npmjs.com/) account (verify your current user with `npm whoami`).
1. Run `yarn publish`.
1. Set the next version of the library.
1. Wait for the build to succeed.
1. Push the release commit and tag with `git push --follow-tags`.
