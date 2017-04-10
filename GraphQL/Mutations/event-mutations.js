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
			/*let invites
			if (args.body.invites) {
				// TODO: refactor redundancy fields
				for (let i = 0; i < args.body.invites.length; ++i) {
					args.body.invites[i] = idTransformer.decryptId(args.body.invites[i])
				}
				invites = await User
					.find({_id: {$in: args.body.invites}})
					//.where({friends: user._id})
					.select({_id: 1, name: 1})
					.exec()
				//console.log(invites)
				invites.forEach(p => {
					event.userInfo[p._id] = p
				})
				console.log(invites)
			}
			event.invites = invites*/
			console.log(event)
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
			const event = await Event.findById(idTransformer.decryptId(args.eventId)).exec()
			for (let i = 0; i < args.userIds.length; ++i) {
				event.invites.addToSet(idTransformer.decryptId(args.userIds[i]))
			}
			const saved = await event.save()
			return Boolean(saved)
		}
	}
}