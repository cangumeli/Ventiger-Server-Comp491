import mongoose  from 'mongoose'
const { Oid, Mixed } = mongoose.SchemaTypes

const LocationSchema = new mongoose.Schema({
	info: String,
	coordinates: [Number],
	address: String,
	reference: Oid // for universal location reference
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
	done: {type: Boolean, default: false}
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
	todoCount: {type: Number, default: 0}
})

EventSchema.index({participants: 1})
EventSchema.index({invites: 1})
// Necessary fields in all selections
EventSchema.statics.meta = {
	userInfo: 1
}

EventSchema.statics.selectionKeys = function (keys) {
	return {
		...EventSchema.statics.meta,
		...keys
	}
}

EventSchema.methods.denormalizeUsers = function () {
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
	return obj
}

export default mongoose.model('Event', EventSchema)
