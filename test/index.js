/* eslint strict: 0 */
'use strict';

const Waitron = require('../index.js');
const test = require('tape-catch');

test('waitron basics', function testWaitronBasics (t) {
	t.strictEqual(typeof Waitron, 'function', 'waitron should be a function');

	var waitron = new Waitron();
	t.ok(waitron instanceof Waitron, 'waitron should return instance of waitron class');
	t.strictEqual(typeof waitron.hold, 'function', 'returned object should have a `hold` method');
	t.strictEqual(typeof waitron.go, 'function', 'returned object should have a `go` method');

	t.ok(Waitron.hasOwnProperty('MAX_COUNT'), 'should provide `MAX_COUNT` value');
	t.ok(!isNaN(Waitron.MAX_COUNT) && Waitron.MAX_COUNT > 0, '`MAX_COUNT` should be more than 0');

	/* eslint-disable */
	var waitron2 = Waitron();
	/* eslint-enable */
	t.ok(waitron2 instanceof Waitron, 'waitron should return instance of waitron class even when called without `new`');

	// Should call back
	waitron.go(null, t.end.bind(t));
});

test('waitron safety', function testWaitronSafety (t) {
	var waitron = new Waitron();

	var callbacks = 0;
	var count = 0;

	var holders = [waitron.hold(), waitron.hold().bind(null, new Error('test error'))];

	waitron.go(null, () => {
		callbacks++;

		t.strictEqual(callbacks, 1, 'Callback should be called only once');
		t.strictEqual(count, holders.length, 'Callback should be called only after everything was done');

		var release = waitron.hold();
		t.strictEqual(typeof release, 'function', '`hold` should be safe to call even after waitron finished');
		release();

		t.strictEqual(waitron.go(null, () => t.end()), true, '`waitron.go()` should return true after waitron is finished');

		waitron = null;
	});

	t.strictEqual(waitron.go(), false, '`waitron.go()` should return false until waitron is finished');

	var releaser = function () {
		if (count >= holders.length) {
			return;
		}

		setTimeout(() => {
			t.strictEqual(holders[count](), count + 1 >= holders.length, '`go` returned from `hold` should return false unless waitron is finished');
			count++;
			releaser();
		});
	};

	releaser();
});

test('waitron error handling', function testWaitronErrors (t) {
	var waitron = new Waitron();

	var errorText = 'something went terribly wrong';

	var go = waitron.hold();

	waitron.go(null, errors => {
		t.strictEqual(Array.isArray(errors), true, 'callback should receive list of errors, if there were any');
		t.strictEqual(errors[0].message, errorText, 'should contain passed error');
		t.end();
	});

	setTimeout(() => go(errorText));
});

test('waitron capacity', function testWaitronCapacity (t) {
	var waitron = new Waitron();

	for (var i = Waitron.MAX_COUNT; i >= 0; i--) {
		(waitron.hold())();
	}

	var go = waitron.hold();
	t.strictEqual(typeof go, 'function', 'should return function even after MAX_COUNT is exceeded');
	go('custom error');

	waitron.go(null, errors => {
		t.strictEqual(Array.isArray(errors), true, 'callback should receive list of errors, if there were any');
		t.strictEqual(errors.length, 1, 'should pass a single error');
		t.strictEqual(errors[0].message.indexOf('MAX_COUNT'), 0, 'the only error should be for "MAX_COUNT exceeded"');
		t.end();
	});
});
