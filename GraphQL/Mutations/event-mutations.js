import Event from '../../Models/event'
import User from '../../Models/user'
import {
	EventType,
	EventBodyType
} from '../Types/event-types'
import {
	GraphQLNonNull,
	GraphQLString,
	GraphQLBoolean,
	GraphQLID,
	GraphQLList
} from 'graphql'
import { IdentityTransformer } from '../../Models/identy-transformer'

const idTransformer = new IdentityTransformer()
import { getProjection, idTransformerToEventTransformer, idTransformerToUserTransformer } from '../utils'
const eventTransformer = idTransformerToEventTransformer(idTransformer)
const userTransformer = idTransformerToUserTransformer(idTransformer)

export default {
	createEvent: {
		type: EventType,
		args: {
			body: {
				type: new GraphQLNonNull(EventBodyType),
				name: 'body'
			},
			token: {
				name: 'token',
				type: GraphQLString
			}
		},
		async resolve(source, args, _, info) {
			const user = User.verifyToken(args.token || source.token)
			const projection = getProjection(info.fieldNodes)
			const event = new Event({
				...args.body,
				creator: user._id,
				userInfo: {
					[user._id]: {...user, admin: true}
				}
			})
			event.participants.push(user._id)
			let saved = await event.save()
			const transformed = eventTransformer.encrypt(saved.denormalizeUsers())
			console.log('here')
			return transformed
		},
	},
	inviteToEvent: {
		type: GraphQLBoolean,
		args: {
			userIds: {
				name: 'userIds',
				type: new GraphQLNonNull(new GraphQLList(GraphQLID))
			},
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			},
			token: {
				name: 'token',
				type: GraphQLString
			},
		},
		async resolve(source, args) {
			const me = User.verifyToken(args.token || source.token)
			const event = await Event
				.findById(idTransformer.decryptId(args.eventId))
				.where({participants: me._id})
				.select({invites: 1, ...Event.meta})
				.exec()
			if (!event) {
				throw Error('NoSuchEvent')
			}
			for (let i = 0; i < args.userIds.length; ++i) {
				event.invites.addToSet(idTransformer.decryptId(args.userIds[i]))
			}
			const saved = await event.save()
			return Boolean(saved)
		}
	},
	acceptEventInvitation: {
		type: EventType,
		args: {
			token: {
				name: 'token',
				type: GraphQLString
			},
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		async resolve(source, args, _, info) {
			const me = User.verifyToken(args.token || source.token)
			const proj = getProjection(info.fieldNodes)
			const eid = idTransformer.decryptId(args.eventId)
			const event = await Event
				.findById(eid)
				.where({invites: me._id})
				.select(Event.selectionKeys({...proj, participants: 1, invites: 1}))
				.exec()
			if (!event) {
				throw Error('NoSuchEvent')
			}
			event.participants.addToSet(me._id)
			event.invites.pull(me._id)
			event.userInfo[me._id] = me
			event.markModified(`userInfo.${me._id}`)
			const saved = await event.save()
			return eventTransformer.encrypt(saved.denormalizeUsers())
		}
	},
	rejectEventInvitation: {
		type: GraphQLBoolean,
		args: {
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			},
			token: {
				name: 'token',
				type: GraphQLString
			},
		},
		async resolve(source, args) {
			const me = User.verifyToken(args.token || source.token)
			const eid = idTransformer.decryptId(args.eventId)
			console.log("Mee! ", me)
			const {n, nModified } = await Event
				.update(
					{_id: eid},
					{
						$pull: {invites: me._id},
						$unset: {[`userInfo.${me._id}`]: ""}
					})
				.exec()
			if (n == 0) {
				throw Error('NoSuchEvent')
			}
			return Boolean(nModified)
		}
	}
}