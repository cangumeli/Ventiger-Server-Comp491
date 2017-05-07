import mongoose from 'mongoose'
//import {ValidationCodeSchema, ValidationCode} from './_validation-code'
import crypto from 'crypto'
const {Oid, Mixed} = mongoose.SchemaTypes

const MessageSchema = new mongoose.Schema({
	sender: Oid,
	content: String,
	sentAt: {type: Date, default: Date.now},
	removed: {type: Boolean, default: false}
})

const EventChatSchema = new mongoose.Schema({
	eventId: {type: Oid},
	context: {type: String, required: true},
	messages: [MessageSchema],
	messageInc: {type: Number, default: 0},
	accessCode: String,//ValidationCodeSchema
})

EventChatSchema.index({eventId: 1})

EventChatSchema.methods.generateAccessCode = function () {
	this.accessCode = crypto.randomBytes(16).toString('hex')
	return this.accessCode
}

const EventChat = mongoose.model('EventChat', EventChatSchema)

export default EventChat