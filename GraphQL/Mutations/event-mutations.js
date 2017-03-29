import Event from '../../Models/event'
import User from '../../Models/user'
import {
	EventType,
	EventBodyType
} from '../Types/event-types'
import {
	GraphQLNonNull,
	GraphQLString
} from 'graphql'
import { IdentityTransformer } from '../../Models/identy-transformer'

const idTransformer = new IdentityTransformer()
import { getProjection, idTransformerToEventTransformer } from '../utils'
const eventTransformer = idTransformerToEventTransformer(idTransformer)

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
			let invites
			if (args.body.invites) {
				// TODO: refactor redundancy fields
				invites = await User
					.find({_id: {$in: args.body.invites}})
					.select({_id: 1, name: 1})
					.exec()
				//console.log(invites)
				invites.forEach(p => {
					event.userInfo[p._id] = p
				})
			}
			let saved = await event.save()
			saved.denormalizeUsers()
			//saved = saved.toObject()
			/*saved.creator = {...user, admin:true}
			saved.invites = invites*/
			const transformed = eventTransformer.encrypt(saved.denormalizeUsers())
			return transformed
		}
	}
}