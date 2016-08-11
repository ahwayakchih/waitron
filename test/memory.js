/* global gc */
/* eslint strict: 0 */
'use strict';

const Waitron = require('../index.js');
const heapdump = require('heapdump');
// const profiler = require('v8-profiler');

// const leak = [];
function fakeWait () {
	var waitron = new Waitron();
	for (let i = Waitron.MAX_COUNT; i >= 0; i--) {
		(waitron.hold())();
	}

	// leak.push(waitron);
	waitron.go();
}

if (typeof gc !== 'function') {
	console.error('`gc` function is missing. Make sure to run this test with `--expose-gc` option passed to node.');
	process.exit(1);
}

setTimeout(function () {
	gc();
	heapdump.writeSnapshot('reports/test-memory-1.heapsnapshot');
}, 100);

for (let i = 0; i < 10000; i++) {
	setImmediate(fakeWait);
}

gc();
heapdump.writeSnapshot('reports/test-memory-0.heapsnapshot');
