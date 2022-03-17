import nodePath from 'path';
import util from 'util';

import _glob from 'glob';

const glob = util.promisify(_glob);

const now = () => {
  const [s, ns] = process.hrtime();
  return s + ns / 1e9;
};

const getPaths = async ({ patterns }) => [
  ...new Set((await Promise.all(patterns.map(pattern => glob(pattern)))).flat())
];

const createDeferred = () => {
  const deferred = {};
  deferred.promise = new Promise((resolve, reject) =>
    Object.assign(deferred, { resolve, reject })
  );
  return deferred;
};

const flatten = ({ node, prefix = '' }) =>
  typeof node === 'function'
    ? { [prefix]: node }
    : Object.entries(node ?? {}).reduce(
        (nodes, [name, next]) =>
          Object.assign(
            nodes,
            flatten({
              node: next,
              prefix:
                name === 'default'
                  ? ''
                  : `${prefix && `${prefix} `}${
                      Array.isArray(node) ? `[${name}]` : name
                    }`
            })
          ),
        {}
      );

export default async ({ bail, patterns, onTestStart, onTestEnd }) => {
  const start = now();
  const paths = await getPaths({ patterns });
  const tests = new Map();
  for (const path of paths) {
    try {
      const node = await import(nodePath.resolve(path));
      for (const [name, fn] of Object.entries(flatten({ node }))) {
        tests.set({ name, path }, fn);
      }
    } catch (er) {
      tests.set({ name: '', path }, er);
    }
  }

  const always = new Set();
  const only = new Set();
  const skip = new Set();
  for (const key of tests.keys()) {
    if (key.name.includes('#always')) always.add(key);
    if (key.name.includes('#only')) only.add(key);
    if (key.name.includes('#skip')) skip.add(key);
  }

  let index = 0;
  const toRun = [];
  const passed = [];
  const failed = [];
  const skipped = [];
  for (const [key, fn] of tests.entries()) {
    const result = { ...key };
    if (skip.has(key) || (!always.has(key) && only.size && !only.has(key))) {
      skipped.push(result);
      continue;
    }

    result.index = ++index;
    toRun.push({ fn, result });
  }

  for (const { fn, result } of toRun) {
    if (bail && failed.length) {
      skipped.push(result);
      continue;
    }

    result.length = toRun.length;
    if (onTestStart) await onTestStart(result);
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
    } catch (er) {
      result.error = er;
    }

    result.duration = (now() - start).toFixed(3);
    if (result.error) failed.push(result);
    else passed.push(result);

    if (onTestEnd) await onTestEnd(result);
  }

  return { duration: (now() - start).toFixed(3), failed, passed, skipped };
};
