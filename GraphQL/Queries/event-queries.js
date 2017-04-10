import Event from '../../Models/event'
import {
	getProjection,
	idTransformerToEventTransformer
} from '../utils'
import {IdentityTransformer} from '../../Models/identy-transformer'
import {
	GraphQLString,
	GraphQLID,
	GraphQLNonNull,
	GraphQLList
} from 'graphql'
import {
	EventType
} from '../Types/event-types'
const idTransformer = new IdentityTransformer()
const eventTransformer = idTransformerToEventTransformer(idTransformer)

export const viewer = {
	events: {
		type: new GraphQLList(EventType),
		async resolve(source, _, __, info) {
			const events = await Event
				.find({participants: source._id})
				.select(Event.selectionKeys(getProjection(info.fieldNodes)))
				.exec()
			//events.forEach(event => event.denormalizeUsers())
			return events.map(event => eventTransformer.encrypt(event.denormalizeUsers()))
		}
	},
	event: {
		type: EventType,
		args: {
			_id: {
				name: '_id',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		async resolve(source, args, __, info) {
			const event = await Event
				.findOne({
					$and: [{_id: args._id}, {participants: source._id}]
				})
				.select(Event.selectionKeys(getProjection(info.fieldNodes)))
				.exec()
			if (!event) {
				throw Error('NoSuchEvent')
			}
			return eventTransformer.encrypt(event.denormalizeUsers())
		}
	},
	eventInvitations: {
		type: new GraphQLList(EventType),
		async resolve(source, args, __, info) {
			const proj = getProjection(info.fieldNodes)
			console.log(source._id)
			const events =  await Event.find({invites: source._id}).exec()//.select({...proj, ...Event.meta}).exec()
			console.log(events)
			const events_ = await Event.find().select('invites').exec()
			console.log(events_)
			return events
		}
	}
}