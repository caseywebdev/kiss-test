const { performance, Map, Promise, Set } = globalThis;

const now = () => performance.now() / 1000;

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

const flatten = (node, prefix = '') =>
  typeof node === 'function'
    ? { [prefix]: node }
    : Object.entries(node ?? {}).reduce(
        (nodes, [name, next]) =>
          Object.assign(
            nodes,
            flatten(
              next,
              name === 'default'
                ? ''
                : `${prefix && `${prefix} `}${
                    Array.isArray(node) ? `[${name}]` : name
                  }`
            )
          ),
        {}
      );

export default async ({ bail, tests: _tests, onTestStart, onTestEnd }) => {
  const start = now();
  const tests = new Map();
  for (const [path, node] of Object.entries(_tests)) {
    for (const [name, fn] of Object.entries(flatten(node))) {
      tests.set({ name, path }, fn);
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
