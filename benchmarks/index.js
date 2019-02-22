const benchmark = require('benchmark').Suite;
const results   = require('beautify-benchmark');
const os        = require('os');

const async     = require('async');
const neoasync  = require('neo-async');
const Waitron   = require('../index.js');

if (process.env.INFO) {
	logInfo();
}

const holders  = parseInt(process.env.HOLDERS || '0', 10);

const test = benchmark('waitron');

test.add('async', {
	defer: true,
	fn   : function (deferred) {
		var tasks = [];

		for (var i = holders; i >= 0; i--) {
			tasks.push(fakeTask());
		}

		async.parallel(tasks, err => {
			if (err) {
				console.error(err);
			}

			return deferred.resolve();
		});
	}
});

test.add('neo-async', {
	defer: true,
	fn   : function (deferred) {
		var tasks = [];

		for (var i = holders; i >= 0; i--) {
			tasks.push(fakeTask());
		}

		neoasync.parallel(tasks, err => {
			if (err) {
				console.error(err);
			}

			return deferred.resolve();
		});
	}
});

test.add('waitron', {
	defer: true,
	fn   : function (deferred) {
		var waitron = new Waitron();

		for (var i = holders; i >= 0; i--) {
			fakeTask()(waitron.hold());
		}

		waitron.go(null, errs => {
			if (errs && errs.length > 0) {
				console.error(errs[0]);
			}

			return deferred.resolve();
		});
	}
});

test.on('start', function () {
	console.log(`Test with ${holders} holders`);
	console.log('');
});

test.on('cycle', function (event) {
	results.add(event.target);
});

test.on('complete', function () {
	results.store.sort((a, b) => b.hz - a.hz);
	results.log();
});

test.run({
	async: false
});

/**
 * Show info about environment and tested packages.
 *
 * @private
 */
function logInfo () {
	console.log(`Running on node ${process.version} with ${os.cpus()[0].model} x ${os.cpus().length}`);
	console.log('');
	console.log('Testing:');

	var columns = columnsCreate(['name', 'version', 'homepage']);

	var infoAsync = require('async/package.json');
	infoAsync.version = 'v' + infoAsync.version;
	columnsUpdate(columns, infoAsync);

	var infoNeoAsync = require('neo-async/package.json');
	infoNeoAsync.version = 'v' + infoNeoAsync.version;
	columnsUpdate(columns, infoNeoAsync);

	var infoWaitron = require('../package.json');
	infoWaitron.version = 'v' + infoWaitron.version;
	columnsUpdate(columns, infoWaitron);

	console.log('- ' + columnsText(columns, infoAsync));
	console.log('- ' + columnsText(columns, infoNeoAsync));
	console.log('- ' + columnsText(columns, infoWaitron));
	console.log('');

	function columnsCreate (names) {
		return names.map(name => {
			return {size: 0, source: name};
		});
	}

	function columnsUpdate (columns, info) {
		var size;
		var col;
		for (var i = 0; i < columns.length; i++) {
			col = columns[i];
			size = (info[col.source] && info[col.source].length) || 0;
			if (info[col.source] && (size = info[col.source].length) && size > col.size) {
				col.size = size;
			}
		}
	}

	function columnsText (columns, info) {
		var result = '';

		for (var i = 0; i < columns.length; i++) {
			result += columnText(columns[i], info);
			result += ' ';
		}

		return result + ' ';
	}

	function columnText (column, info) {
		var value = info[column.source] || '';
		var padSize = column.size - value.length;
		var pad = '';

		if (padSize) {
			pad += (new Array(padSize + 1)).join(' ');
		}

		return value + pad;
	}
}

/**
 * Fake task, that simply calls back asynchronously.
 *
 * @private
 */
function fakeTask () {
	var r = Math.random();
	return callback => setImmediate(() => {
		callback(null, Math.random() * r);
		r = null;
	});
}
