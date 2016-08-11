/* eslint strict: 0 */
'use strict';

const ToDoId = require('./lib/ToDoId.js');

/**
 * @exports Waitron
 */
module.exports = Waitron;

/**
 * Maximum number of available "locks".
 *
 * It is equal to `ToDoId.MAX_COUNT - 1` by default (all possible locks except for the initial one).
 *
 * @const
 */
Waitron.MAX_COUNT = ToDoId.MAX_COUNT - 1;

/**
 * Waitron provides a kind of asynchronous-semaphore-like like functionality
 * ([Asynchronous_semaphore](https://en.wikipedia.org/wiki/Asynchronous_semaphore)):
 * it creates an object that can be "held" and then "let go".
 *
 * With each call to `hold` method, caller marks object as "locked" and gets a function
 * that, when called, will release that lock.
 * It starts locked, with `go` method that will release initial lock.
 *
 * @example
 * var launcher = new Waitron();
 * setTimeout(launcher.hold(), 100);
 * setTimeout(launcher.hold(), 200);
 * launcher.go(null, errors => {
 *     // We're here after 200 milliseconds - both locks were released
 * });
 *
 * @constructor
 */
function Waitron () {
	if (!(this instanceof Waitron)) {
		return new Waitron();
	}

	const errors = [];
	var tasks = new ToDoId();
	var callback = null;

	/**
	 * @private
	 */
	function go (todo, id, err, whenDone) {
		// Mark id as done only if whole thing was not finished yet
		const notDone = todo && todo.done(id);

		if (err && tasks) {
			var error = err instanceof Error ? err : new Error(err);
			error.id = id;
			errors.push(error);
		}

		// Set callback only when there was none before
		if (whenDone && whenDone instanceof Function && !callback) {
			callback = whenDone;
		}

		// Return early if not all tasks are done yet
		if (notDone) {
			return false;
		}

		// Make sure it cannot be changed before `callback` is called
		tasks = null;

		// Keep errors, just in case something calls `go` again
		// with new callback.

		if (callback) {
			// Cleanup callbacks before calling them,
			// so we're not go looping if any of them triggers `done` again.
			var listener = callback;
			callback = null;

			setImmediate(() => listener(errors && errors.length ? errors : null));
		}

		return true;
	}

	/**
	 * @private
	 */
	function hold () {
		const list = tasks;
		var id;

		if (!list) {
			id = new Error('Waitron already finished');
			// Always pass cb here, because it will not be stored after waitron is finished.
			return (err, cb) => go(null, 0, err ? appendError(id, err) : id, cb);
		}

		id = list.todo();
		if (id instanceof Error) {
			// Pass cb only if first task was already done, to make sure we will not set callback for later task.
			return (err, cb) => go(list, 0, err ? appendError(id, err) : id, list.done() & 1 ? null : cb);
		}

		// Pass cb only for first "lock".
		return (err, cb) => go(list, id, err, id === 1 && cb);
	}

	/**
	 * Release "lock" bound to this function.
	 *
	 * When called as `waitron.go`, optionally register callback
	 * that should be called after all other "locks" are released.
	 *
	 * Errors are stored and kept for any future calls, so calling `go`
	 * multiple times, will call back with both old and new errors.
	 *
	 * @callback go
	 * @param {Error}    err
	 * @param {Function} [callback]   Will be called once all "locks" are released
	 * @return {boolean} `true` if no more "locks" are held
	 */

	/**
	 * Acquire "lock" and return function that will release it.
	 *
	 * @function
	 * @return {module:Waitron~go}
	 */
	this.hold = hold;

	/**
	 * Release initial lock.
	 *
	 * @type {module:Waitron~go}
	 * @function
	 * @param {Error}    err
	 * @param {Function} callback   Will be called once all "locks" are released
	 * @return {boolean} `true` if no more "locks" are held
	 */
	this.go = hold();
}

/**
 * @private
 */
function appendError (to, err) {
	if (!err) {
		return to;
	}

	var from = err instanceof Error ? err : new Error(err);

	to.stack = from.stack + '\n' + to.stack;
	to.message = to.message + ' & ' + from.message;

	return to;
}
