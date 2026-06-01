import { styleText } from 'node:util';

const { console, Intl } = globalThis;

const numberFormat = new Intl.NumberFormat();
const maybeOps = durations => {
  if (durations.length < 2) return '';

  const median = durations.sort()[Math.floor(durations.length / 2)];
  if (!median) return '';

  const ops = Math.round(1 / median);
  return styleText('yellow', `${numberFormat.format(ops)} op/s`);
};

export default {
  onTestStart: ({ index, path, name }) => {
    console.log(
      `${styleText('cyan', `${index}`)} ${styleText('magenta', path)} ${name}`
    );
  },

  onTestEnd: ({ duration, durations, error, index, length }) => {
    if (error) console.log(error);
    console.log(
      []
        .concat(
          error ? styleText('red', `Failed`) : styleText('green', 'Passed'),
          styleText('yellow', `${duration}s`),
          styleText('cyan', `${Math.floor((index / length) * 100)}%`),
          maybeOps(durations) || []
        )
        .join(styleText('gray', ' | ')) + `\n`
    );
  },

  onComplete: ({ duration, failed, passed, skipped }) => {
    if (failed.length) {
      console.log(styleText('red', 'Failures'));
      for (const { index, path, name, error } of failed) {
        console.log(
          `${styleText('cyan', `${index}`)} ${styleText('magenta', path)} ${name}`
        );
        console.log(error);
        console.log('');
      }
    }

    console.log(
      [
        styleText('green', `${passed.length} passed`),
        styleText('blue', `${skipped.length} skipped`),
        styleText('red', `${failed.length} failed`),
        styleText('yellow', `${duration}s`)
      ].join(styleText('gray', ' | '))
    );
  }
};
