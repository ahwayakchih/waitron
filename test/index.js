/* eslint strict: 0 */
'use strict';

const waitron = require('../index.js');
const test = require('tape-catch');

test('waitron basics', function testWaitronBasics (t) {
	t.strictEqual(typeof waitron, 'function', 'waitron should be a function');

	var delay = waitron();
	t.strictEqual(typeof delay.hold, 'function', 'returned object should have a `hold` method');
	t.strictEqual(typeof delay.go, 'function', 'returned object should have a `go` method');

	// Should call back
	delay.go(null, t.end.bind(t));
});

test('waitron for synchronous tasks', function testWaitronBasics (t) {
	var delay = waitron();

	t.strictEqual(delay.hold()(), true, 'Should return true when released synchronously right after hold');

	// Should call back
	delay.go(null, t.end.bind(t));
});

test('waitron asynchronicity', function testWaitronAsynchronicity (t) {
	var called = 0;
	var delay = waitron();

	var release1 = delay.hold();
	setTimeout(() => {
		t.strictEqual(release1(), true, 'Release should return true if was not released before');
		t.strictEqual(release1(), false, 'Second call to the same release should return false');
		t.strictEqual(release1(), false, 'Multiple calls to the same release should return false');
	}, 100);

	var release2 = delay.hold();
	setTimeout(() => {
		t.strictEqual(release2(), true, 'Release of second hold should return true');
		t.strictEqual(release2(), false, 'Calling the same release again should return false');
	}, 200);

	delay.go(null, (errors) => {
		called++;
		t.strictEqual(called, 1, 'Should call only after after everything is done');
		t.strictEqual(errors, null, 'Should call without errors');
		t.end(errors);
	});
});

test('waitron safety', function testWaitronSafety (t) {
	var delay = waitron();

	var callbacks = 0;
	var count = 0;

	var holders = [delay.hold(), delay.hold(), delay.hold()];
	delay.go(null, (errors) => {
		callbacks++;
		t.strictEqual(errors, null, 'Should not have errors');

		t.strictEqual(callbacks, 1, 'Callback should be called only once');
		t.strictEqual(count, holders.length, 'Callback should be called only after everything was done');

		var release = delay.hold();
		t.strictEqual(typeof release, 'function', '`hold` should be safe to call even after waitron finished');
		t.strictEqual(release(), undefined, 'release created after waitron finished should return undefined');

		t.strictEqual(delay.go(null, t.end), false, '`waitron.go()` should return false after waitron is finished');

		delay = null;
	});

	t.strictEqual(delay.go(null, () => t.fail('THIS SHOULD NEVER BE CALLED')), false, '`waitron.go()` should return false after second and next calls');

	var releaser = function () {
		if (count >= holders.length) {
			return;
		}
		holders[count++]();
		setTimeout(releaser);
	};

	releaser();
});

test('waitron error handling', function testWaitronErrors (t) {
	var delay = waitron();

	var errorText = 'something went terribly wrong';

	var go = delay.hold();

	delay.go(null, errors => {
		t.strictEqual(Array.isArray(errors), true, 'callback should receive list of errors, if there were any');
		t.strictEqual(errors[0].message, errorText, 'should contain passed error');
		t.end();
	});

	setTimeout(() => go(errorText));
});
