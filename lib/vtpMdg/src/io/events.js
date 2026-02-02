const EventEmitter = require('events');

class EventBus extends EventEmitter { }
const bus = new EventBus();

module.exports = bus;
