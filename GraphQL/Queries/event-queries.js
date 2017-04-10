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
	EventType,
	EventInvitationType
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
					$and: [{_id: idTransformer.decryptId(args._id)}, {participants: source._id}]
				})
				.select(Event.selectionKeys(getProjection(info.fieldNodes)))
				.exec()
			if (!event) {
				throw Error('NoSuchEvent')
			}
			console.log('\nparticipants2 ', event.participants)
			return eventTransformer.encrypt(event.denormalizeUsers())
		}
	},
	eventInvitations: {
		type: new GraphQLList(EventInvitationType),
		async resolve(source, args, __, info) {
			const proj = getProjection(info.fieldNodes)
			const events =  await Event
				.find({invites: source._id})
				//.select(Event.selectionKeys(proj))
				.exec()//.select({...proj, ...Event.meta}).exec()
			console.log('\nevent ', events.map(event=>event.denormalizeUsers()))
			return events.map(event=>event.denormalizeUsers())
		}
	}
}