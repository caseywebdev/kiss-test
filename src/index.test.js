const noop = () => {};

export default {
  simple: noop,
  nested: {
    name: noop,
    another: noop
  },
  promise: async () => await 1,
  arrayTest: [
    noop,
    noop,
    { 'with a name #skip': noop },
    [{ nested: noop }, { array: noop }]
  ],
  'intentional failure': () => {
    throw new Error('Intentional failure');
  }
};
