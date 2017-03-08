import { GraphQLSchema, GraphQLObjectType, GraphQLBoolean } from 'graphql'
import userMutations from './Mutations/user-mutations'
import userQueries from './Queries/user-queries'

export default new GraphQLSchema({
	mutation: new GraphQLObjectType({
		name: 'Mutation',
		fields: {
			...userMutations
		}
	}),
	query: new GraphQLObjectType({
		name: 'Query',
		fields: {
			...userQueries
		}
	})
	/*query: new GraphQLObjectType({
		name: 'Query',
		fields: {
			user: {
				name: 'UserQueries',
				type: new GraphQLObjectType({
					name: 'User',
					fields: {
						something: {name: 'something', type: GraphQLBoolean},
						...userQueries
					}
				}),
				resolve: (source, data) => {
					return {something: true}
				}
			}
		}
	})*/
})