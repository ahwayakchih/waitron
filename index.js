/* eslint strict: 0 */
'use strict';

const {
	createPoolOf,
	POOL_NEXT
} = require('./lib/pool');

const INIT = Symbol('init');

const poolOfWaitrons = createPoolOf(Waitron);
const poolOfDelays = createPoolOf(WaitronDelay);

/**
 * @module Waitron
 */

/**
 * Prepare and return a Waitron object.
 *
 * @return {module:Waitron~Waitron}
 */
module.exports = function getWaitron () {
	var w = poolOfWaitrons.get();
	w[INIT]();
	return w;
};

/**
 * Waitron provides a kind of asynchronous-semaphore-like functionality
 * ([Asynchronous_semaphore](https://en.wikipedia.org/wiki/Asynchronous_semaphore)):
 * it creates an object that can be "held" and then "let go".
 *
 * With each call to `hold` method, caller marks object as "delayed" and gets a function
 * that, when called, will stop the delay.
 * It starts "delayed", with initial `hold` called. To remove that "delay", call the `go` method.
 *
 * @example
 * const waitron = require('waitron').get;
 * var launcher = waitron();
 * setTimeout(launcher.hold(), 100);
 * setTimeout(launcher.hold(), 200);
 * launcher.go(null, errors => {
 *     // We're here after 200 milliseconds - both delays were removed
 * });
 *
 * @class
 */
function Waitron () {
	this[POOL_NEXT] = null;

	/**
	 * @private
	 */
	var id = null;

	/**
	 * @private
	 */
	var go = null;

	/**
	 * @private
	 */
	var delays = 0;

	/**
	 * @private
	 */
	var errors = null;

	/**
	 * @private
	 */
	var whenDone = null;

	/**
	 * Called after each delay is removed.
	 *
	 * @private
	 * @param {module:Waitron~WaitronDelay} delay
	 * @param {bigint}       startedBy
	 * @param {Error}        [error]
	 * @return {boolean} `true` if delay could be released
	 */
	var onEachRelease = (delay, startedBy, error) => {
		if (startedBy !== id) {
			return false;
		}

		delays--;
		poolOfDelays.put(delay);

		if (error) {
			if (!(error instanceof Error)) {
				error = new Error(error);
			}
			error.id = id;

			if (!errors) {
				errors = [];
			}

			errors.push(error);
		}

		if (delays > 0) {
			return true;
		}

		id = null;
		go = null;

		whenDone(errors && errors.length ? errors : null);

		errors = null;
		whenDone = null;
		poolOfWaitrons.put(this);
		return true;
	};

	/**
	 * Cleanup initial state, create initial delay.
	 *
	 * @private
	 */
	this[INIT] = () => {
		whenDone = null;
		errors = delays > 0 ? [new Error('Waitron reinitialized before finish')] : null;
		delays = 0;
		id = process.hrtime.bigint();
		go = this.hold();
	};

	/**
	 * A function that, once called, will release it's hold on Waitron.
	 *
	 * @callback module:Waitron~go
	 * @see {@link module:Waitron~Waitron#hold}
	 * @param {Error} error
	 */

	/**
	 * Delays waitron until returned function is called.
	 *
	 * @return {module:Waitron~go}
	 */
	this.hold = () => {
		if (!id) {
			return noop;
		}

		delays++;
		return (poolOfDelays.get()).start(id, onEachRelease);
	};

	/**
	 * Stop the initial delay.
	 *
	 * @param {Error}    err        Set error, if needed
	 * @param {Function} callback   Will be called once all "delays" are gone
	 * @return {boolean} `false` if called on uninitialized Waitron
	 */
	this.go = (err, callback) => {
		if (!id || !go) {
			process.nextTick(callback);
			return false;
		}

		whenDone = whenDone || callback;
		return go && go(err) || false;
	};
}

/**
 * Used when `hold` is called after Waitron was finished.
 *
 * @private
 */
function noop () {
	// Function intentionally left empty.
}

/**
 * Object used to delay Waitron.
 *
 * @class
 * @private
 */
function WaitronDelay () {
	this[POOL_NEXT] = null;

	var started = null;
	var onEnd = null;

	this.start = (id, callback) => {
		if (started && started !== id) {
			return null;
		}

		started = id;
		onEnd = callback;
		return this.end;
	};

	this.end = error => {
		var callback = onEnd;
		var id = started;

		onEnd = null;
		started = null;

		return callback && callback(this, id, error) || false;
	};
}
