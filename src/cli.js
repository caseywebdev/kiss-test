#!/usr/bin/env node

import chalk from 'chalk';

import kissTest from './index.js';

const { blue, gray, green, red, yellow } = new chalk.Instance({ level: 1 });

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

  onTestStart: ({ path, name }) => {
    console.log(`${gray(path)} ${name}`);
  },

  onTestEnd: ({ duration, error }) => {
    if (error) {
      console.log(error);
      console.log(red(`Failed`) + gray(' | ') + yellow(`${duration}s\n`));
    } else {
      console.log(green('Passed') + gray(' | ') + yellow(`${duration}s\n`));
    }
  }
}).then(({ duration, failed, passed, skipped }) => {
  if (failed.length) {
    console.log(red('Failures'));
    for (const { path, name, error } of failed) {
      console.log(`${gray(path)} ${name}`);
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
