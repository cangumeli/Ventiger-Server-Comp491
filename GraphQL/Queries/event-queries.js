import Event from '../../Models/event'
import {
	getProjection,
	idTransformerToEventTransformer,
	idTransformerToUserTransformer
} from '../utils'
import {IdentityTransformer} from '../../Models/identy-transformer'
import {
	GraphQLString,
	GraphQLID,
	GraphQLNonNull,
	GraphQLList
} from 'graphql'
import {
	EventType,
	EventInvitationType
} from '../Types/event-types'
const idTransformer = new IdentityTransformer()
const eventTransformer = idTransformerToEventTransformer(idTransformer)
const userTransformer = idTransformerToUserTransformer(idTransformer)

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
					$and: [{_id: idTransformer.decryptId(args._id)}, {participants: source._id}]
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
		type: new GraphQLList(EventInvitationType),
		async resolve(source, args, __, info) {
			const proj = getProjection(info.fieldNodes)
			const events =  await Event
				.find({invites: source._id})
				.select(Event.selectionKeys(proj))
				.exec()
			for (let i = 0; i < events.length; ++i) {
				events[i] = eventTransformer.encrypt(events[i])
				events[i].invitor = userTransformer.encryptUser(events[i].userInfo[events[i].userInfo[source._id].invitor])
			}
			//console.log("\nevent asd",Object.keys(events[0] || {}))// && events[0].toObject())
			return events
		}
	}
}