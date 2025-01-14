import chalk from 'chalk';

const { console, Intl } = globalThis;

const { blue, cyan, gray, green, magenta, red, yellow } = chalk;

const numberFormat = new Intl.NumberFormat();
const maybeOps = durations => {
  if (durations.length < 2) return '';

  const median = durations.sort()[Math.floor(durations.length / 2)];
  if (!median) return '';

  const ops = Math.round(1 / median);
  return yellow(`${numberFormat.format(ops)} op/s`);
};

export default {
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
  },

  onComplete: ({ duration, failed, passed, skipped }) => {
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
  }
};
