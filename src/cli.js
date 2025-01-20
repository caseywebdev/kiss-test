#!/usr/bin/env node
import fs from 'node:fs/promises';
import nodePath from 'node:path';

import chalk from 'chalk';

import log from './log.js';

import kissTest from './index.js';

const { console, process, Set } = globalThis;

const { red } = chalk;

const { onTestStart, onTestEnd, onComplete } = log;

const handleSignal = signal => {
  console.log(red(`Received ${signal}, exiting immediately...`));
  process.exit(1);
};

process.on('SIGINT', handleSignal).on('SIGTERM', handleSignal);

const possibleFlags = new Set(['--bail']);
const enabledFlags = new Set();
const patterns = process.argv.slice(2);
while (possibleFlags.has(patterns[0])) enabledFlags.add(patterns.shift());

const tests = {};
for (const pattern of patterns) {
  for (const path of (await Array.fromAsync(fs.glob(pattern))).sort()) {
    tests[path] ??= await import(nodePath.resolve(path));
  }
}

const bail = enabledFlags.has('--bail');

const result = await kissTest({ bail, tests, onTestStart, onTestEnd });

onComplete(result);

process.exit(result.failed.length === 0 ? 0 : 1);
