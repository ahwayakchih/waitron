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

	/**
	 * @private
	 */
	this._tasks = new ToDoId();

	/**
	 * @private
	 */
	this._errors = undefined;

	/**
	 * @private
	 */
	this._callback = undefined;

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
	// bind undefined seems to give better (faster) results than bind this: https://github.com/nodejs/node/pull/6533#discussion_r93454731
	this.hold = hold.bind(undefined, this);

	/**
	 * Release initial lock.
	 *
	 * @type {module:Waitron~go}
	 * @function
	 * @param {Error}    err
	 * @param {Function} callback   Will be called once all "locks" are released
	 * @return {boolean} `true` if no more "locks" are held
	 */
	this.go = hold(this);
}

/**
 * @private
 * @param {!Waitron}  waitron
 * @param {!Number}   id
 * @param {Error}     [err]
 * @param {Function}  [whenDone]
 * @return {Boolean}
 */
function go (waitron, id, err, whenDone) {
	const list = waitron._tasks;
	var error = list && err;

	if (id instanceof Error) {
		error = error ? appendError(id, error) : id;
		id = 0;
	}

	if (error) {
		if (!(error instanceof Error)) {
			error = new Error(error);
		}
		error.id = id;

		if (!waitron._errors) {
			waitron._errors = [];
		}

		waitron._errors.push(error);
	}

	// Mark id as done only if whole thing was not finished yet
	const notDone = list && list.done(id);

	// Set callback if any of these is true:
	// - waitron was already done
	// - initial task is already done (which means it already had a chance to setup a callback but did not want to)
	// - it is a callback for initial task
	// ... AND callback was not set yet.
	if (whenDone && (!list || notDone & 1 === 0 || id === 1) && whenDone instanceof Function && !waitron._callback) {
		waitron._callback = whenDone;
	}

	// Return early if not all tasks are done yet
	if (notDone) {
		return false;
	}

	// Make sure it cannot be changed before `callback` is called
	waitron._tasks = null;

	// Keep errors, just in case something calls `go` again
	// with new callback.

	if (waitron._callback) {
		// Cleanup callbacks before calling them,
		// so we're not go looping if any of them triggers `done` again.
		var listener = waitron._callback;
		waitron._callback = null;

		error = waitron._errors;
		setImmediate(listener, error && error.length ? error : null);
	}

	return true;
}

/**
 * @private
 * @param {Waitron} waitron
 * @return {Function}
 */
function hold (waitron) {
	const id = waitron._tasks ? waitron._tasks.todo() : new Error('Waitron already finished');

	// bind in node 7.x is now faster than inline closures: https://github.com/nodejs/readable-stream/pull/253#issuecomment-270416143
	return go.bind(undefined, waitron, id);
}

/**
 * @private
 * @param {!Error}       to
 * @param {Error|String} err
 * @return {Error} modified `to`
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
