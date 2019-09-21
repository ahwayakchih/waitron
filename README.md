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
Running inside Docker (Alpine Linux v3.10) with Node v12.10.0 and Intel(R) Core(TM) i7-3537U CPU @ 2.00GHz x 4

Testing:
- async     v3.1.0 https://caolan.github.io/async/         
- neo-async v2.6.1 https://github.com/suguru03/neo-async   
- waitron   v1.0.4 https://github.com/ahwayakchih/waitron  

Test with 0 holders

  3 tests completed.

  neo-async x 360,445 ops/sec ±1.52% (76 runs sampled)
  async     x 327,539 ops/sec ±1.42% (76 runs sampled)
  waitron   x 259,527 ops/sec ±1.46% (73 runs sampled)

Test with 5 holders

  3 tests completed.

  neo-async x 228,425 ops/sec ±1.30% (77 runs sampled)
  async     x 186,580 ops/sec ±1.48% (77 runs sampled)
  waitron   x 175,470 ops/sec ±1.61% (71 runs sampled)

Test with 15 holders

  3 tests completed.

  neo-async x 133,081 ops/sec ±1.52% (77 runs sampled)
  waitron   x 117,537 ops/sec ±1.66% (72 runs sampled)
  async     x 102,126 ops/sec ±1.90% (75 runs sampled)

Test with 29 holders

  3 tests completed.

  neo-async x 82,433 ops/sec ±1.37% (77 runs sampled)
  waitron   x 79,799 ops/sec ±1.37% (83 runs sampled)
  async     x 65,931 ops/sec ±1.87% (79 runs sampled)
```