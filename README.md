waitron
=======

Waitron provides a kind of asynchronous-semaphore-like like functionality ([Asynchronous_semaphore](https://en.wikipedia.org/wiki/Asynchronous_semaphore)): it creates an object through which asynchronous operations can let others know that they need to "hold" on for them, and then when they can "go" on.

With each call to `hold` method, caller marks object as "locked" and gets a function that, when called, will release that lock.
Calling `go` will start waiting for all "locks" to be released.
Once all "locks" are released, no more "locks" can be acquired. Released "locks" cannot be "locked" again.

It allows to start multiple asynchronous functions and wait for all of them to finish before continuing. It is similar to [`async.parallel`](https://github.com/caolan/async), but also differs quite a bit:

- it does not call/execute those functions, it merely provides simple way for them to mark when they're done;
- it waits for all of them to call back and gathers all errors before calling back (`async.parallel` calls back after first error);
- it does not gather and pass results when calling back;
- number of "locks" is limited by the number of bits that are available for bitwise operations in JavaScript runtime, which means that currently only 30 "locks" can be acquired (additional 2 are for internal use).

Unless you need these, `async.parallel` might be a better choice for you.


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
// Somewhere inside rocket-manned module...
process.on('prepare-for-launch', hold => {
  // Fastening seatbelts is asynchronous, we have to wait
  // until everyone is done.
  pilots.fastenSeatbelts(hold());
  passengers.fastenSeatbelts(hold());
});

// Somewhere else inside rocket-log module...
process.on('prepare-for-launch', hold => {
  // We do not need to delay anything
  console.log('Preparing for launch');
});

// Somewhere in command center...
var launcher = new Waitron();
process.emit('prepare-for-launch', launcher.hold);
launcher.go(null, errors => {
  // If everything is OK, launch!
  if (!errors) {
    start();
  }
});
```


## Benchmarks

These benchmarks are just to make sure that working with Waitron is not slower (actually it should be faster, as it does less things for you) than working with [`async.parallel`](https://github.com/caolan/async). Both modules provide different functionality, so they shouldn't be evaluated solely by results of these benchmarks.
You can re-run them locally with: `npm run benchmarks`.

```markdown
Running on node v8.1.4 with Intel(R) Core(TM) i7-3537U CPU @ 2.00GHz x 4

Testing:
- async   v2.5.0 https://github.com/caolan/async         
- waitron v1.0.2 https://github.com/ahwayakchih/waitron  

Test with 0 holders

  2 tests completed.

  async   x 221,084 ops/sec ±2.75% (80 runs sampled)
  waitron x 186,298 ops/sec ±1.30% (80 runs sampled)

Test with 5 holders

  2 tests completed.

  async   x 113,783 ops/sec ±3.92% (77 runs sampled)
  waitron x 113,400 ops/sec ±0.30% (82 runs sampled)

Test with 10 holders

  2 tests completed.

  waitron x 84,008 ops/sec ±3.23% (82 runs sampled)
  async   x 80,010 ops/sec ±1.40% (83 runs sampled)

Test with 20 holders

  2 tests completed.

  waitron x 53,674 ops/sec ±2.56% (83 runs sampled)
  async   x 49,012 ops/sec ±2.47% (84 runs sampled)
```