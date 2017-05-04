import mongoose  from 'mongoose'
const { Oid, Mixed } = mongoose.SchemaTypes

const LocationSchema = new mongoose.Schema({
	info: String,
	coordinates: [Number],
	address: String,
	reference: Oid, // for universal location reference
})

const TimeSchema = new mongoose.Schema({
	startTime: Date,
	endTime: Date,
})

const TodoSchema = new mongoose.Schema({
	creator: Oid,
	description: String,
	takers: [Oid],
	takersRequired: {type: Number, default: 1, min: 1},
	done: {type: Boolean, default: false},
	createdAt: {type: Date, default: Date.now}
})

const PollOptionSchema = new mongoose.Schema({
	poll: Oid,
	description: String,
	// Auto-update fields
	time: TimeSchema,
	location: LocationSchema,
})

const autoUpdateTypes = ['FINISH', 'ALWAYS']
const PollSchema = new mongoose.Schema({
	title: String,
	creator: Oid,
	multi: {type: Boolean, default: true},
	open: {type: Boolean, default: true},
	options: [PollOptionSchema],
	autoUpdateType: {
		type: String,
		enum: autoUpdateTypes,
		default: 'FINISH'
	},
	autoUpdateFields: [{
		type: String,
		enum: ['location', 'time']
	}],
	createdAt: {type: Date, default: Date.now}
})

const EventSchema = new mongoose.Schema({
	title: {type: String, required: true},
	info: String,
	time: TimeSchema,
	location: LocationSchema,
	creator: Oid,
	participants: [{type: Oid, ref: 'User'}],
	invites: [{type: Oid}],
	userInfo: Mixed, // Redundant data for fast access
	todos: [TodoSchema],
	todoCount: {type: Number, default: 0},
	polls: [PollSchema],
	pollVoters: {type: Mixed, default: {}}, // pollId -> optionId -> [userId]
	autoUpdateFields: [{
		type: String,
		enum: ['location', 'time']
	}],
	createdAt: {type: Date, default: Date.now}
})

EventSchema.post('init', doc => {
	if (doc.polls && doc.pollVoters) {
		doc.polls.forEach(p => {
			p.options.forEach(o => {
				if (!doc.pollVoters[p._id]) {
					doc.pollVoters[p._id] = {}
				}
				if (!doc.pollVoters[p._id][o._id]) {
					doc.pollVoters[p._id][o._id] = []
				}
				if (p.open &&
					p.autoUpdateType === 'ALWAYS' &&
					p.autoUpdateFields.length > 0) {
					doc.performAutoUpdate(p)
				}
			})
		})
	}
})

EventSchema.index({participants: 1})
EventSchema.index({invites: 1})
// Necessary fields in all selections
EventSchema.statics.meta = {
	userInfo: 1,
	pollVoters: 1,
	autoUpdateFields: 1,
	polls: 1 // For auto-update
}

EventSchema.statics.selectionKeys = function (keys) {
	return {
		...EventSchema.statics.meta,
		...keys
	}
}

EventSchema.statics.POLL_AUTOUPDATE_TYPES = autoUpdateTypes

EventSchema.methods.denormalize = function () {
	const obj = this.toObject()
	if (obj.creator) {
		obj.creator = obj.userInfo[obj.creator] || this.userInfo[obj.creator.toString()]
	}
	/*this.participants = this.participants.map(p => this.userInfo[p])
	this.invites = this.invites.map(p => this.userInfo[p])*/
	const userArrays = ['participants', 'invites']
	userArrays.forEach(field => {
		if (obj[field]) {
			obj[field] = obj[field].map(id =>
				(obj.userInfo[id] || obj.userInfo[id.toString()]))
			//console.log(this[field])
		}
	})
	if (obj.todos) {
		obj.todos.forEach(todo => {
			todo.creator = obj.userInfo[todo.creator] || obj.userInfo[todo.creator.toString()]
			todo.takers = todo.takers.map(id => obj.userInfo[id] || obj.userInfo[id.toString()])
		})
	}
	if (obj.polls) {
		obj.polls.forEach(poll => {
			//poll.voters = obj.userInfo[poll.voters] || obj.userInfo[poll.voters.toString()]
			poll.creator = obj.userInfo[poll.creator]// || obj.userInfo[poll.creator.toString()]
			poll.options.forEach(option => {
				option.voters = obj.pollVoters[poll._id][option._id].map(p=>obj.userInfo[p])
			})
		})
	}
	return obj
}

EventSchema.methods.performAutoUpdate = function (poll) {
	const votes = this.pollVoters[poll._id] || this.pollVoters[poll._id.toString()]
	let maxVote=0, maxId
	Object.keys(votes).forEach(oid => {
		if (votes[oid].length > maxVote) {
			maxVote = votes[oid].length
			maxId = oid
		}
	})
	if (maxId) {
		const winner = poll.options.find(o=>o._id.toString() === maxId.toString())
		poll.autoUpdateFields.forEach(f => {
			this[f] = winner[f]
		})
	}
}

export default mongoose.model('Event', EventSchema)
