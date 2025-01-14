#!/usr/bin/env node
import fs from 'node:fs/promises';
import nodePath from 'node:path';

import chalk from 'chalk';

import kissTest from './index.js';

const { console, Intl, process, Set } = globalThis;

const { blue, cyan, gray, green, magenta, red, yellow } = chalk;

const handleSignal = signal => {
  console.log(red(`Received ${signal}, exiting immediately...`));
  process.exit(1);
};

process.on('SIGINT', handleSignal).on('SIGTERM', handleSignal);

const possibleFlags = new Set(['--bail']);
const enabledFlags = new Set();
const patterns = process.argv.slice(2);
while (possibleFlags.has(patterns[0])) enabledFlags.add(patterns.shift());

const numberFormat = new Intl.NumberFormat();
const maybeOps = durations => {
  if (durations.length < 2) return '';

  const median = durations.sort()[Math.floor(durations.length / 2)];
  if (!median) return '';

  const ops = Math.round(1 / median);
  return yellow(`${numberFormat.format(ops)} op/s`);
};

const tests = {};
for (const path of await Array.fromAsync(fs.glob(patterns))) {
  tests[path] = await import(nodePath.resolve(path));
}

kissTest({
  bail: enabledFlags.has('--bail'),

  tests,

  onTestStart: ({ index, path, name }) => {
    console.log(`${cyan(index)} ${magenta(path)} ${name}`);
  },

  onTestEnd: ({ duration, durations, error, index, length }) => {
    if (error) console.log(error);
    console.log(
      []
        .concat(
          error ? red(`Failed`) : green('Passed'),
          yellow(`${duration}s`),
          cyan(`${Math.floor((index / length) * 100)}%`),
          maybeOps(durations) || []
        )
        .join(gray(' | ')) + `\n`
    );
  }
}).then(({ duration, failed, passed, skipped }) => {
  if (failed.length) {
    console.log(red('Failures'));
    for (const { index, path, name, error } of failed) {
      console.log(`${cyan(index)} ${magenta(path)} ${name}`);
      console.log(error);
      console.log('');
    }
  }

  console.log(
    [
      green(`${passed.length} passed`),
      blue(`${skipped.length} skipped`),
      red(`${failed.length} failed`),
      yellow(`${duration}s`)
    ].join(gray(' | '))
  );

  process.exit(failed.length === 0 ? 0 : 1);
});
