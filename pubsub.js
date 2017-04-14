import redis from 'redis'

class PubSub {
	static instance = null
	constructor() {
		if (PubSub.instance !== null) {
			throw Error('Duplicate initalization of singleton object')
		}
		this._pub = redis.createClient()
		this._sub = redis.createClient()
	}

	publish(channel, message) {
		this._pub.publish(channel, JSON.stringify(message))
	}

	subscribe(channel) {
		this._sub.subscribe(channel)
	}

	unsubscribe(channel) {
		this._sub.unsubscribe(channel)
	}

	on(channel, cb) {
		this._sub.on("message", (_channel, message) => {
			if (channel === _channel) {
				cb(JSON.parse(message))
			}
		})
	}
}

export default (() => {
	if (PubSub.instance === null) {
		PubSub.instance = new PubSub()
	}
	return PubSub.instance
})()