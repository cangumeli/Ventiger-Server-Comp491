import {
	GraphQLInputObjectType,
	GraphQLObjectType,
	GraphQLString,
	GraphQLNonNull,
	GraphQLID,
	GraphQLInt
} from 'graphql'

import {
	GraphQLEmail,
	GraphQLPassword
} from 'graphql-custom-types'

export const RegistrationType = new GraphQLInputObjectType({
	name: 'RegistrationBody',
	fields: {
		name: {type: new GraphQLNonNull(GraphQLString)},
		phone: {type: GraphQLString},
		email: {type: GraphQLEmail},
		password: {type: new GraphQLNonNull( new GraphQLPassword(6, 30))}
	}
})

export const LoginType = new GraphQLInputObjectType({
	name: 'LoginBody',
	fields: {
		phone: {type: GraphQLString},
		email: {type: GraphQLEmail},
		password: {type: new GraphQLNonNull(new GraphQLPassword(6, 30))}
	}
})

export const TokenType = new GraphQLObjectType({
	name: 'AuthenticationToken',
	fields: {
		token: {type: GraphQLString},
		daysToExpiry: {type: GraphQLInt}
	}
})

export const ProfileType = new GraphQLObjectType({
	name: 'Profile',
	fields: {
		phone: {type: GraphQLString},
		email: {type: GraphQLEmail},
		name: {type: GraphQLString},
		_id: {type: GraphQLID},
	}
})
