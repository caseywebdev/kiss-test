#!/usr/bin/env node

import { glob, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseArgs, styleText } from 'node:util';

import log from './log.js';

import { test } from './index.js';

const { console, process, URL } = globalThis;

const { onTestStart, onTestEnd, onComplete } = log;

const handleSignal = signal => {
  console.log(styleText('red', `Received ${signal}, exiting immediately...`));
  process.exit(1);
};

process.on('SIGINT', handleSignal).on('SIGTERM', handleSignal);

const { pathname: thisPath } = new URL(import.meta.url);
const packagePath = `${dirname(thisPath)}/../package.json`;
const { version } = JSON.parse(await readFile(packagePath));

const options = /** @type {const} */ ({
  bail: {
    description: 'Exit process after first test failure',
    type: 'boolean',
    short: 'b',
    default: false
  },
  help: { description: 'Show usage details', type: 'boolean', short: 'h' },
  version: { description: 'Show version', type: 'boolean', short: 'v' }
});

/** @param {string} [errorMessage] */
const showHelp = errorMessage => {
  const maxKeyLength = Object.keys(options).reduce(
    (max, key) => Math.max(key.length, max),
    0
  );

  console[errorMessage ? 'error' : 'log'](
    `${errorMessage ? `${errorMessage}\n\n` : ''}Run tests

kiss-test [options] pattern [...pattern]

${Object.entries(options)
  .map(
    ([key, { short, description }]) =>
      `--${key.padEnd(maxKeyLength)} -${short} ${description}`
  )
  .join('\n')}`
  );
  process.exit(errorMessage ? 1 : 0);
};

let positionals;
let values;

try {
  ({ positionals, values } = parseArgs({
    allowNegative: true,
    allowPositionals: true,
    options,
    strict: true
  }));
} catch (er) {
  throw showHelp(er instanceof Error ? er.message : 'Unknown Error');
}

if (values.help) throw showHelp();

if (values.version) {
  console.log(version);
  process.exit();
}

const { bail } = values;

const tests = {};
for (const pattern of positionals) {
  for (const path of (await Array.fromAsync(glob(pattern))).sort()) {
    tests[path] ??= await import(resolve(path));
  }
}
console.log(tests);

const result = await test({ bail, tests, onTestStart, onTestEnd });

onComplete(result);

process.exit(result.failed.length === 0 ? 0 : 1);
