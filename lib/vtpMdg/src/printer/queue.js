/**
 * Simple Promise-based serial queue.
 * Ensures jobs (async functions) run one after another.
 */
class JobQueue {
    constructor() {
        this._p = Promise.resolve();
        this._len = 0;
    }

    enqueue(fn) {
        this._len++;
        const run = async () => {
            try {
                return await fn();
            } finally {
                this._len--;
            }
        };
        // Append to the chain
        this._p = this._p.then(run, run);
        return this._p;
    }

    size() {
        return this._len;
    }
}

module.exports = JobQueue;
