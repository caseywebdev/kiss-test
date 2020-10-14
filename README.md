# kiss-test
Keep It Simple, Stupid - Test

## Installation
`npm install --save-dev kiss-test`

## Configuration
- Specify testing module, location, and path (in package.json)
- This example will run any file within the src directory that ends in .test.js
```
"scripts": {
  "test": "kiss-test 'src/**/*.test.js'"
},
```

## Adding tests (inside a .test.js file)
- Use whichever assertion you prefer 
- Export function for kiss to process
```
import { strict as assert } from 'assert';
export default {
  test1: () => {
      assert.equal(value1, value2)
  },
  test2: ...
}
```

## Run:
`npm test`

## Output (logs):
- Status for each test with failures grouped at the end
- Debug info for failed tests (location/reason/message)
- passed | skipped | failed | total time
