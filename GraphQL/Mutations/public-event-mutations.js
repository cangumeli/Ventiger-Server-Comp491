import PublicEvent from '../../Models/public-event'
import User from '../../Models/user'
import {
	EventType,
	EventBodyType,
	TodoType,
	TodoBodyType,
	TodoActionType,
	PollOptionInputType,
	PollInputType,
	PollType,
	PollOptionType,
	VotingActionType,
	EventUpdateType
} from '../Types/event-types'
import {
	GraphQLNonNull,
	GraphQLString,
	GraphQLBoolean,
	GraphQLID,
	GraphQLList,
} from 'graphql'
import {IdentityTransformer} from '../../Models/identy-transformer'

const idTransformer = new IdentityTransformer()
import {
	getProjection,
	idTransformerToEventTransformer,
	idTransformerToUserTransformer,
	idTransformerTodoTransformer,
	idTransformerToPollTransformer
} from '../utils'
const eventTransformer = idTransformerToEventTransformer(idTransformer)
const userTransformer = idTransformerToUserTransformer(idTransformer)
const todoTransformer = idTransformerTodoTransformer(idTransformer)
const pollTransformer = idTransformerToPollTransformer(idTransformer)


export default {
	joinRequestToPublicEvent: {
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
			const event = await PublicEvent
				.findById(idTransformer.decryptId(args.eventId))
				.select({})
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
}