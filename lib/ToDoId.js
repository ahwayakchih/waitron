/* eslint strict: 0 */
'use strict';

/**
 * @exports ToDoId
 */
module.exports = ToDoId;

/**
 * ToDoId is a simplistic "todo list", without names, descriptions, etc... it simply
 * locks id number and then allows to mark it as "done".
 * Id numbers are limited by the number of bits available for bitwise operations,
 * which means that it can mark up to 31 "tasks".
 *
 * @class
 */
function ToDoId () {
	this.items = 0;
	this.nextIndex = 1;
}

/**
 * Maximum number of available "slots" for items.
 *
 * @const
 */
ToDoId.MAX_COUNT = (function () {
	var test = 1;
	var count = 0;
	while (test) {
		count++;
		test <<= 1;
	}

	// Return count - 1, because "0" is reserved for "ToDoId is done"
	return count - 1;
})();

/**
 * Error message used when maximum number of available id numbers is exceeded.
 *
 * @const
 */
ToDoId.ERROR_MAX_EXCEEDED = 'MAX_COUNT of ' + ToDoId.MAX_COUNT + ' items exceeded';

/**
 * Check if there is next Id available.
 *
 * @return {boolean}
 */
ToDoId.prototype.available = function available () {
	return Boolean(this.nextIndex);
};

/**
 * Acquire next Id number or return error.
 *
 * @return {number|Error}
 */
ToDoId.prototype.todo = function todo () {
	if (!this.nextIndex) {
		return new Error(ToDoId.ERROR_MAX_EXCEEDED);
	}

	var id = this.nextIndex;
	this.nextIndex <<= 1;

	this.items |= id;

	return id;
};

/**
 * Mark specified Id number as "done".
 *
 * When all tasks are done, returned number will be `0` (as in: "nothing else to do").
 *
 * @return {number}
 */
ToDoId.prototype.done = function done (id) {
	if (id) {
		this.items &= ~id;
	}

	return this.items;
};
