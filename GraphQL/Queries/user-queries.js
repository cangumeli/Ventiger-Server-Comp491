import User from '../../Models/user'

import {
	UserType
} from '../Types/user-types'

import {
	GraphQLNonNull,
	GraphQLID,
	GraphQLObjectType
} from 'graphql'

export default {
	user: {
		type: UserType,
		args: {
			_id: {
				name: '_id',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		async resolve(source, args) {
			return User.findById(args._id).exec()
		}
	}
}