import mongoose from 'mongoose'
import Event from './event'
const {Oid} = mongoose.SchemaTypes

const publicToEnumFields = ['EVERYONE', 'FRIENDS']
export const PublicToEnum = publicToEnumFields.reduce((obj, cur) => {
	obj[cur] = cur
	return obj
}, {})
const PublicEventSchema = new mongoose.Schema({
	publicTo: {
		type: String,
		enum: publicToEnumFields
	},
	requesters: [{type: Oid, ref: 'User'}],
})

PublicEventSchema.methods.denormalize = function () {
	const obj = this.model('Event').prototype.denormalize.call(this)

	if (obj.requesters) {
		obj.requesters = obj.requesters.map(id =>
			(obj.userInfo[id] || obj.userInfo[id.toString()]))
	}
	return obj
}
export default Event.discriminator('PublicEvent', PublicEventSchema)