import {
	GraphQLSchema, GraphQLObjectType,
	GraphQLID, GraphQLString
} from 'graphql'
import userMutations from './Mutations/user-mutations'
import eventMutations from './Mutations/event-mutations'
import eventSubs from './Subscriptions/event-subscriptions'
import {global as globalUser, viewer as viewerUser } from './Queries/user-queries'
import User from '../Models/user'
import { viewer as viewerEvent } from './Queries/event-queries'
import IdTransformer from '../Models/identy-transformer'
const idTransformer = new IdTransformer()
import { idTransformerToUserTransformer } from './utils'

export default new GraphQLSchema({
	mutation: new GraphQLObjectType({
		name: 'Mutation',
		fields: {
			...userMutations,
			...eventMutations
		}
	}),
	subscription: new GraphQLObjectType({
		name: 'Subscription',
		fields: {
			...eventSubs
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
						...viewerEvent
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