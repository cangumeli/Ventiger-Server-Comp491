import User from '../../Models/user'

import {
	ProfileType
} from '../Types/user-types'

import {
	GraphQLNonNull,
	GraphQLID,
	GraphQLBoolean,
	GraphQLString,
	GraphQLList
} from 'graphql'

import {
	GraphQLEmail
} from 'graphql-custom-types'

import { getProjection } from '../utils'

export const global = {
	//TODO: Consider overrides in boolean queries
	phoneValid: {
		type: GraphQLBoolean,
		args: {
			phone: {
				name: 'phone',
				type: new GraphQLNonNull(GraphQLString)
			}
		},
		async resolve(source, args) {
			const user = await User
				.findOne({phone: args.phone})
				.select('_id')
				.exec()
			return !Boolean(user)
		}
	},

	emailValid: {
		type: GraphQLBoolean,
		args: {
			email: {
				name: 'email',
				type: new GraphQLNonNull(GraphQLEmail)
			}
		},
		async resolve(source, args) {
			const user = await User
				.findOne({email: args.email})
				.select('_id')
				.exec()
			return !Boolean(user)
		}
	},
}

export const viewer = {
	profile: {
		type: ProfileType,
		args: {
			_id: {
				name: '_id',
				type: GraphQLID
			}
		},
		async resolve(source, args, context, info) {
			// TODO: add friend and random profile support
			// console.log(info.fieldNodes[0].selectionSet.selections)
			const projection = getProjection(info.fieldNodes)
			/*console.log('source', source)
			console.log('args', args)
			console.log('_id', args._id || source._id)
			console.log('projection', projection)*/
			 const user = await User
				.findById(args._id || source._id)
				.select(projection)
				.exec()
			//console.log('user', user)
			return user
		}
	},
	friendRequests: {
		type: new GraphQLList(ProfileType),
		async resolve(source, args, context, info) {
			const projection = getProjection(info.fieldNodes)
			const { friendRequests } = await User
				.findById(source._id)
				.select('friendRequests')
				.populate({
					path: 'friendRequests',
					select: {...projection, visibility:1}
				})
				.exec()
			return friendRequests.map(user => user.visibilityFilter('everyone'))
		}
	},
	friends: {
		type: new GraphQLList(ProfileType),
		async resolve(source, args, context, info) {
			const projection = getProjection(info.fieldNodes)
			const { friends } = await User
				.findById(source._id)
				.select('friends')
				.populate({
					path: 'friends',
					select: projection
				})
				.exec()
			return friends.map(friend => friend.visibilityFilter('friend'))
		}
	},
	contacts: {
		type: new GraphQLList(ProfileType),
		args: {
			phones: {
				name: 'phones',
				type: new GraphQLList(GraphQLString)
			}
		},
		async resolve(source, args, context, info) {
			const projection = getProjection(info.fieldNodes)
			const { friends } = await User
				.findById(source._id)
				.select('friends')
				.exec()
			const contacts = await User
				.find({
					_id: {$nin: friends},
					phone: {$in: args.phones}
				})
				.select(projection)
				.exec()
			return contacts.map(c => c.visibilityFilter())
		}

	}
}