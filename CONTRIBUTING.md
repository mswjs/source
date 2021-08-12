## Generating HAR fixtures

### Why not automate?

There are no reliable automation tools to generate HAR files from traffic. The discrepancies introduces by those tools alter the identity of the generated HAR files, which means the same traffic results in a different HAR file when exported from the browser manually.

To retain the most confidence, this library uses a manual approach to HAR fixtures.

### 1. Create a usage scenario.

Usage scenario consists of two parts:

1. A temporary HTTP server responsible for responses.
1. A list of client-side requests issued by the automated browser.

```sh
$ touch test/traffic/fixtures/request/<NEW-SCENARIO>.ts
```

> Reference the existing scenarios for more information.

### 2. Export HAR file from the browser

Run the usage example in the browser:

```sh
$ yarn har:fixture test/traffic/fixtures/request/<NEW-SCENARIO>.ts
```

Export the Network log as the `*.har` file using the browser's Dev Tools.

### 3. Add and commit the HAR file

Add the exported `*.har` file to `test/traffic/fixtures/archives` and commit the changes.
