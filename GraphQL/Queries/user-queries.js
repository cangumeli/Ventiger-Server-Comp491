import User from '../../Models/user'

import {
	ProfileType,
	UserRelation
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

import {
	getProjection,
	idTransformerToUserTransformer
} from '../utils'
import {IdentityTransformer} from '../../Models/identy-transformer'

const idTransformer = new IdentityTransformer()
const {encryptUser: encryptUserId, decryptUser: decryptUserId} = idTransformerToUserTransformer(idTransformer)

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
			args = decryptUserId(args)

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
			args = decryptUserId(args)

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
			args = decryptUserId(args)

			if (!args._id || (args._id === source._id) ) {
				const projection = getProjection(info.fieldNodes)
				const user = await User
					.findById(source._id)
					.select(projection)
					.exec()
				return encryptUserId(user)
			}
			const myid = source._id
			const otherid = args._id
			const users = await User
				.find({_id: {$in: [source._id, args._id]}})
				.exec()
			if (users.length < 2) {
				throw Error('UserNotFound')
			}
			const me = users.find(user => user._id.equals(myid))
			const other = users.find(user => user._id.equals(otherid))
			return encryptUserId(other.visibilityFilter(User.getVisibilityByRelation(other.getRelation(me))))
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
			return friendRequests.map(user => encryptUserId(user.visibilityFilter('everyone')))
		}
	},
	friends: {
		type: new GraphQLList(ProfileType),
		args: {
			sortedBy: {
				name: 'sortedBy',
				type: GraphQLString
			}
		},
		async resolve(source, args, context, info) {
			args = decryptUserId(args)
			const projection = getProjection(info.fieldNodes)
			let query = User.findById(source._id)
			const getPopulationOptions = () => {
				const pop = {
					path: 'friends',
					select: projection
				}
				if (!args.sortedBy) {
					return pop
				}
				switch (args.sortedBy.toLowerCase()) {
					case "name":
						return {
							...pop,
							options: {sort: {name: 1}}
						}
					default:
						throw Error('Unknown sort key')
				}
			}
			query.populate(getPopulationOptions())
			const { friends } = await query.exec()
			return friends.map(friend => encryptUserId(friend.visibilityFilter('friend')))
		}
	},
	relation:{
		type: UserRelation,
		args: {
			_id: {
				name: '_id',
				type: GraphQLID
			}
		},
		async resolve(source, args){
			args = decryptUserId(args)

			if(!args._id || source._id === args._id){
				return User.RELATIONS.MYSELF.value
			}
			const users = await User
				.find({_id: {$in: [source._id, args._id]}})
				.exec()
			if (users.length < 2) {
				throw Error('UserNotFound')
			}
			let me, other
			for (let i = 0; i < 2; i++) {
				if (users[i]._id.toString() === source._id) {
					me = users[i]
				} else {
					other = users[i]
				}
			}
			return me.getRelation(other)
		}
	},
	contacts: {
		type: new GraphQLList(ProfileType),
		args: {
			phones: {
				name: 'phones',
				type: new GraphQLNonNull(new GraphQLList(GraphQLString))
			}
		},
		async resolve(source, args, context, info) {
			args = decryptUserId(args)
			//const projection = getProjection(info.fieldNodes)
			// TODO: reconsider the policy
			const users = await User
				.find({$or: [{phone: {$in: args.phones}}, {_id: source._id}]})
				//.select(projection)
				.exec()
			const me = users.find(user => user._id.toString() === source._id)
			return users
				.map(user => {
					const relation = me.getRelation(user)
					return {
						...user.visibilityFilter(User.getVisibilityByRelation(relation)), relation
					}
				})
				.filter(user =>
					(user.relation !== User.RELATIONS.FRIEND.value)
					&& (user.relation !== User.RELATIONS.MYSELF.value))
		}
	}

}