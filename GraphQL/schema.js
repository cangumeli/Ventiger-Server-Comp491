import {
	GraphQLSchema, GraphQLObjectType,
	GraphQLID, GraphQLString
} from 'graphql'
import userMutations from './Mutations/user-mutations'
import eventMutations from './Mutations/event-mutations'
import eventChatMutations from './Mutations/event-chat-mutations'
import eventSubs from './Subscriptions/event-subscriptions'
import eventChatSubs from './Subscriptions/event-chat-subsciptions'
import {global as globalUser, viewer as viewerUser } from './Queries/user-queries'
import { viewer as viewerEvent } from './Queries/event-queries'
import { viewer as viewerEventChat } from './Queries/event-chat-queries'
import User from '../Models/user'
import IdTransformer from '../Models/identy-transformer'

const idTransformer = new IdTransformer()


export default new GraphQLSchema({
	mutation: new GraphQLObjectType({
		name: 'Mutation',
		fields: {
			...userMutations,
			...eventMutations,
			...eventChatMutations
		}
	}),
	subscription: new GraphQLObjectType({
		name: 'Subscription',
		fields: {
			...eventSubs,
			...eventChatSubs
		}
	}),
	/*query: new GraphQLObjectType({
		name: 'Query',
		fields: {
			...userQueries
		}
	})*/
	query: new GraphQLObjectType({
		name: 'Query',
		fields: {
			...globalUser,
			viewer: {
				args: {
					token: {
						name: 'token',
						type: GraphQLString
					}
				},
				name: 'UserQueries',
				type: new GraphQLObjectType({
					name: 'User',
					fields: {
						id: {name: '_id', type: GraphQLID},
						name: {name: 'name', type: GraphQLString},
						...viewerUser,
						...viewerEvent,
						...viewerEventChat
					}
				}),
				resolve: (source, args) => {
					const verified = User.verifyToken(args.token || source.token)
					//source.message = 'hello'
					return {...verified, message: 'hello', id: idTransformer.encryptId(verified._id)}
				}
			}
		}
	})
})