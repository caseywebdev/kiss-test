import nodePath from 'path';
import util from 'util';

import chalk from 'chalk';
import _glob from 'glob';

const glob = util.promisify(_glob);

const { blue, gray, green, red, yellow } = new chalk.Instance({ level: 1 });

const now = () => {
  const [s, ns] = process.hrtime();
  return s + ns / 1e9;
};

const getPaths = async ({ patterns }) =>
  [
    ...new Set(
      (await Promise.all(patterns.map(pattern => glob(pattern)))).flat()
    )
  ].sort();

const createDeferred = () => {
  const deferred = {};
  deferred.promise = new Promise((resolve, reject) =>
    Object.assign(deferred, { resolve, reject })
  );
  return deferred;
};

const flatten = ({ node, prefix }) => {
  if (typeof node === 'function' || node instanceof Error) {
    return { [prefix]: node };
  }

  return Object.entries(node || {}).reduce(
    (nodes, [name, next]) =>
      Object.assign(
        nodes,
        flatten({
          node: next,
          prefix: `${prefix} ${Array.isArray(node) ? `[${name}]` : name}`
        })
      ),
    {}
  );
};

export default async ({ patterns }) => {
  const start = now();
  const tests = {};
  const paths = await getPaths({ patterns });
  for (const path of paths) {
    const prefix = gray(path);
    try {
      const node = (await import(nodePath.resolve(path))).default;
      Object.assign(tests, flatten({ node, prefix }));
    } catch (er) {
      tests[prefix] = er;
    }
  }

  const only = new Set();
  const skip = new Set();
  for (const [name, fn] of Object.entries(tests)) {
    if (name.includes('#only')) only.add(fn);
    if (name.includes('#skip')) skip.add(fn);
  }

  let passed = 0;
  const failed = [];
  let skipped = 0;
  for (const [name, fn] of Object.entries(tests)) {
    if (!skip.has(fn) && (!only.size || only.has(fn))) {
      console.log(name);
      const start = now();
      try {
        if (fn instanceof Error) throw fn;

        if (fn.length) {
          const deferred = createDeferred();
          const cb = er => (er ? deferred.reject(er) : deferred.resolve());
          await fn(cb);
          await deferred.promise;
        } else {
          await fn();
        }
        const duration = (now() - start).toFixed(3);
        console.log(green('Passed') + gray(' | ') + yellow(`${duration}s\n`));
        ++passed;
      } catch (er) {
        const duration = (now() - start).toFixed(3);
        console.log(er);
        console.log(red(`Failed`) + gray(' | ') + yellow(`${duration}s\n`));
        failed.push({ name, error: er });
      }
    } else {
      ++skipped;
    }
  }

  const duration = (now() - start).toFixed(1);

  if (failed.length) {
    console.log(red('Failures'));
    for (const { name, error } of failed) {
      console.log(name);
      console.log(error);
      console.log('');
    }
  }

  console.log(
    [
      green(`${passed} passed`),
      blue(`${skipped} skipped`),
      red(`${failed.length} failed`),
      yellow(`${duration}s`)
    ].join(gray(' | '))
  );

  process.exit(failed.length ? 1 : 0);
};
