#!/usr/bin/env node

import chalk from 'chalk';

import kissTest from './index.js';

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

kissTest({
  bail: enabledFlags.has('--bail'),

  patterns,

  onTestStart: ({ index, path, name }) => {
    console.log(`${cyan(index)} ${magenta(path)} ${name}`);
  },

  onTestEnd: ({ duration, error, index, length }) => {
    if (error) console.log(error);
    console.log(
      [
        error ? red(`Failed`) : green('Passed'),
        yellow(`${duration}s`),
        cyan(`${Math.floor((index / length) * 100)}%\n`)
      ].join(gray(' | '))
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
