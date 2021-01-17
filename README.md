waitron
=======

Waitron provides a kind of asynchronous-semaphore-like like functionality ([Asynchronous_semaphore](https://en.wikipedia.org/wiki/Asynchronous_semaphore)): it creates an object through which asynchronous operations can let others know that they need to "hold on" for them, until they can "go" on.

With each call to `hold` method, caller marks object as "delayed" and gets a function that, when called, will finish that "delay".
Calling `go` will remove the initial "delay" and wait for any other "delays" before calling back.
Once all "delays" are finished, no more can be created (well... they can, they just won't delay anything).

It allows to start multiple asynchronous and synchronous functions and wait for all of them to finish before continuing. It is similar to [`async.parallel`](https://github.com/caolan/async), but also differs quite a bit:

- it does not call/execute those functions, it merely provides simple way for them to mark when they're done;
- it waits for all of them to call back and gathers all errors before calling back (`async.parallel` calls back after first error);
- it does not gather and pass any results from those functions when calling back;

Unless you need these, `async.parallel` might be a better choice for you. Or maybe even [`neo-async.parallel`](https://github.com/suguru03/neo-async), which seems to be even faster.


## Installation

```sh
npm install waitron
```

or:

```sh
npm install https://github.com/ahwayakchih/waitron
```


## Usage

Example use:

```javascript
const waitron = require('waitron');

// Somewhere inside rocket-manned module...
process.on('prepare-for-launch', hold => {
  // Fastening seatbelts is asynchronous, we have to wait
  // until everyone is done.
  pilots.fastenSeatbelts(hold());
  passengers.fastenSeatbelts(hold());
});

// Somewhere else inside rocket-log module...
process.on('prepare-for-launch', hold => {
  // We do not need to delay anything.
  console.log('Preparing for launch');
});

// Somewhere in command center...
var launcher = waitron();
process.emit('prepare-for-launch', launcher.hold);
var selfTest = launcher.hold();
selfTest() && launcher.go(null, errors => {
  // If everything is OK, launch!
  if (!errors) {
    start();
  }
});
```


## Benchmarks

These benchmarks are just to make sure that working with Waitron is not much slower than working with [`async.parallel`](https://github.com/caolan/async). Both modules provide different functionality, so they shouldn't be evaluated solely by results of these benchmarks.
You can re-run them locally with: `npm run benchmarks`.

```markdown
Running inside container (Alpine Linux v3.13) with Node v15.6.0 and Intel(R) Core(TM) i7-3537U CPU @ 2.00GHz x 2

Testing:
- async     v3.2.0 https://caolan.github.io/async/         
- neo-async v2.6.2 https://github.com/suguru03/neo-async   
- waitron   v2.0.1 https://github.com/ahwayakchih/waitron  

Test with 0 holders

  3 tests completed.

  neo-async x 239,486 ops/sec ±0.44% (80 runs sampled)
  waitron   x 233,925 ops/sec ±0.46% (82 runs sampled)
  async     x 216,026 ops/sec ±1.05% (78 runs sampled)

Test with 5 holders

  3 tests completed.

  neo-async x 178,350 ops/sec ±0.42% (83 runs sampled)
  waitron   x 163,394 ops/sec ±0.54% (83 runs sampled)
  async     x 161,941 ops/sec ±1.15% (77 runs sampled)

Test with 15 holders

  3 tests completed.

  waitron   x 123,423 ops/sec ±0.41% (83 runs sampled)
  neo-async x 116,107 ops/sec ±0.64% (80 runs sampled)
  async     x 108,130 ops/sec ±1.12% (80 runs sampled)

Test with 29 holders

  3 tests completed.

  neo-async x 86,743 ops/sec ±0.45% (81 runs sampled)
  waitron   x 85,469 ops/sec ±0.26% (81 runs sampled)
  async     x 73,263 ops/sec ±1.44% (78 runs sampled)
```