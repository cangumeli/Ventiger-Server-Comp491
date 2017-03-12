import {
	GraphQLSchema, GraphQLObjectType,
	GraphQLID, GraphQLString
} from 'graphql'
import userMutations from './Mutations/user-mutations'
import {global as globalUser, viewer as viewerUser } from './Queries/user-queries'
import User from '../Models/user'

export default new GraphQLSchema({
	mutation: new GraphQLObjectType({
		name: 'Mutation',
		fields: {
			...userMutations
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
						_id: {name: '_id', type: GraphQLID},
						...viewerUser
					}
				}),
				resolve: (source, args) => {
					const verified = User.verifyToken(args.token)
					return verified
				}
			}
		}
	})
})