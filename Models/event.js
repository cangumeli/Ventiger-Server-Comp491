import mongoose  from 'mongoose'
const { Oid, Mixed } = mongoose.SchemaTypes

const LocationSchema = new mongoose.Schema({
	info: String,
	coordinates: [Number],
	address: String,
	reference: Oid // for universal location reference
})

const TimeSchema = new mongoose.Schema({
	startDate: Date,
	endDate: Date,
})

const EventSchema = new mongoose.Schema({
	title: {type: String, required: true},
	info: String,
	time: TimeSchema,
	location: LocationSchema,
	creator: Oid,
	participants: [{type: Oid, ref: 'User'}],
	invites: [{type: Oid, ref: 'User'}],
	userInfo: Mixed // Redundant data for fast access
})

EventSchema.index({participants: 1})
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

export default mongoose.model('Event', EventSchema)
