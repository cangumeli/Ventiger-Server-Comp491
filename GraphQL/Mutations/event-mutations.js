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
	GraphQLList,
} from 'graphql'
import { IdentityTransformer } from '../../Models/identy-transformer'

const idTransformer = new IdentityTransformer()
import { getProjection, idTransformerToEventTransformer, idTransformerToUserTransformer } from '../utils'
const eventTransformer = idTransformerToEventTransformer(idTransformer)
const userTransformer = idTransformerToUserTransformer(idTransformer)

async function inviteUsers(event, realUserIds, me) {
	if (realUserIds.length === 0) {
		return
	}
	for (let i = 0; i < realUserIds.length; ++i) {
		event.invites.addToSet(realUserIds[i])
	}
	//console.log('IDs ', realUserIds)
	const cacheInfo = await User
		.find({_id: {$in: realUserIds}})
		.select({name: 1})
		.exec()
	//console.log('Cache info ', cacheInfo)
	if (cacheInfo.length == 0) {
		throw Error('No invites performed')
	}
	for (let i = 0; i < cacheInfo.length; ++i) {
		event.userInfo[cacheInfo[i]._id.toString()] = {...cacheInfo[i].toObject(), invitor: me._id}
		event.markModified('userInfo.' + cacheInfo[i]._id)
	}
}

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
			},
			userIds: {
				name: 'userIds',
				type: new GraphQLList(GraphQLID)
			},
		},
		async resolve(source, args, _, info) {
			const user = User.verifyToken(args.token || source.token)
			const event = new Event({
				...args.body,
				creator: user._id,
				userInfo: {
					[user._id]: {...user, admin: true}
				}
			})
			event.participants.push(user._id)
			if (args.userIds) {
				await inviteUsers(event, args.userIds.map(idTransformer.decryptId), user)
			}
			//console.log('Event ', event)
			let saved = await event.save()
			const transformed = eventTransformer.encrypt(saved.denormalizeUsers())
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
			const realUserIds = args.userIds.map(idTransformer.decryptId)
			await inviteUsers(event, realUserIds, me)
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
	},
	leaveEvent: {
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
			const {n, nModified } = await Event
				.update(
					{_id: eid},
					{
						$pull: {participants: me._id},
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