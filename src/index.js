import nodePath from 'path';
import util from 'util';

import _glob from 'glob';

const { process, Map, Promise, Set } = globalThis;

const glob = util.promisify(_glob);

const now = () => {
  const [s, ns] = process.hrtime();
  return s + ns / 1e9;
};

const getPaths = async ({ patterns }) => [
  ...new Set((await Promise.all(patterns.map(pattern => glob(pattern)))).flat())
];

const createDeferred = () => {
  const deferred = { status: 'pending' };
  deferred.promise = new Promise((resolve, reject) =>
    Object.assign(deferred, {
      resolve: value => {
        if (deferred.status === 'pending') {
          deferred.status = 'fulfilled';
          deferred.value = value;
        }
        return resolve(value);
      },
      reject: value => {
        if (deferred.status === 'pending') {
          deferred.status = 'rejected';
          deferred.value = value;
        }
        return reject(value);
      }
    })
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
    const result = { ...key, durations: [] };
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

      const times = parseInt(result.name.match(/#times=(\d+)/)?.[1]) || 1;
      for (let i = 0; i < times; ++i) {
        const deferred = fn.length && createDeferred();
        const start = now();
        const maybePromise = deferred
          ? fn(er => (er ? deferred.reject(er) : deferred.resolve()))
          : fn();
        if (typeof maybePromise?.then === 'function') await maybePromise;
        if (deferred.status === 'rejected') throw deferred.value;
        else if (deferred.status === 'pending') await deferred.promise;
        result.durations.push(now() - start);
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
