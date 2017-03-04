import { GraphQLSchema, GraphQLObjectType } from 'graphql'
import userMutations from './Mutations/user-mutations'
import userQueries from './Queries/user-queries'

export default new GraphQLSchema({
	mutation: new GraphQLObjectType({
		name: 'Mutation',
		fields: {
			...userMutations,
		}
	}),
	query: new GraphQLObjectType({
		name: 'Query',
		fields: {
			...userQueries,
		}
	})
})