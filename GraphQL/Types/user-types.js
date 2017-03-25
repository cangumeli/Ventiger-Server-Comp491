import {
	GraphQLInputObjectType,
	GraphQLObjectType,
	GraphQLString,
	GraphQLNonNull,
	GraphQLID,
	GraphQLInt,
	GraphQLEnumType
} from 'graphql'
import {
	GraphQLEmail,
	GraphQLPassword
} from 'graphql-custom-types'
import User from '../../Models/user'

export const PasswordType = new GraphQLPassword(6, 30)

export const RegistrationType = new GraphQLInputObjectType({
	name: 'RegistrationBody',
	fields: {
		name: {type: new GraphQLNonNull(GraphQLString)},
		phone: {type: GraphQLString},
		email: {type: GraphQLEmail},
		password: {type: new GraphQLNonNull(PasswordType)}
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

export const ProfileEdit = new GraphQLInputObjectType({
	name: 'ProfileEdit',
	fields: {
		name: {type: GraphQLString},
	}
})

export const UserRelation = new GraphQLEnumType({
	name: 'UserRelation',
	values: User.RELATIONS
})