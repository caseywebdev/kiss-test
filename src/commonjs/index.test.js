const noop = () => {};

module.exports = {
  simple: noop,
  'nested #times=99999': {
    name: noop,
    another: noop
  },
  'promise #times=99999': async () => await noop(),
  'callback #times=99999': cb => cb(),
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
