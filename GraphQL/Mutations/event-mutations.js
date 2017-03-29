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
import { idTransformerToEventTransformer } from '../utils'
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
		async resolve(source, args) {
			const user = User.verifyToken(args.token || source.token)
			const event = new Event({
				...args.body,
				creator: user._id,
				userInfo: {
					[user._id]: user
				}
			})
			let saved = await event.save()
			saved = saved.toObject()
			saved.creator = user
			//console.log(saved)
			const transformed = eventTransformer.encrypt(saved)
			//transformed.creator = user
			//console.log(transformed)
			return transformed
		}
	}
}