/**
 * @module pool
 * @private
 */

/**
 * This is based on https://github.com/mcollina/reusify with following changes:
 *
 * - simplified to not use additional `tail`,
 * - use Symbol instead of string for `next`,
 * - export `next` symbol, so it can be used inside Constructors
 *   to optimize by preventing object's hidden-class rebuilds
 *
 * @private
 */
const NEXT = Symbol('next');

/**
 * Create pool that will call Constructor to create new items when needed.
 *
 * @param {function} Constructor
 * @return {object} Pool with two methods: get and put
 * @private
 */
function pool (Constructor) {
	var head = null;

	/**
	 * Get available or create and get new item.
	 *
	 * @return {object}
	 */
	function get () {
		var current = head || new Constructor();

		head = current[NEXT] || null;
		current[NEXT] = null;

		return current;
	}

	/**
	 * Put object back into pool.
	 *
	 * @param {object} item
	 */
	function put (item) {
		item[NEXT] = head;
		head = item;
	}

	return {
		get,
		put
	};
}

module.exports = {
	createPoolOf: pool,
	POOL_NEXT   : NEXT
};
