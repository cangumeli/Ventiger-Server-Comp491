import {
	RegistrationType,
	LoginType,
	TokenType,
	ProfileEdit,
	PasswordType,
	ProfileType
} from '../Types/user-types'
import {
	GraphQLLimitedString
} from 'graphql-custom-types'
import AbstractUser from '../../Models/abstract-user'
import User from '../../Models/user'
import UnverifiedUser from '../../Models/unverified-user'
import { IdentityTransformer } from '../../Models/identy-transformer'
import bluebird from 'bluebird'
import {
	GraphQLBoolean,
	GraphQLID,
	GraphQLNonNull,
	GraphQLString
} from 'graphql'
import {
	getProjection,
	idTransformerToUserTransformer
} from '../utils'

bluebird.promisifyAll(AbstractUser.collection)
const idTransformer = new IdentityTransformer()
const {encryptUser: encryptUserId} = idTransformerToUserTransformer(idTransformer)


//TODO: consider rule engines
const shouldOverrideUnvalidatedRegister = true

export default {
	register: {
		type: GraphQLID,
		args: {
			body: {
				name: 'body',
				type: new GraphQLNonNull(RegistrationType)
			}
		},
		async resolve(source, args) {
			if (!args.body.phone && !args.body.email) {
				throw new Error('MissingCredentials: email or phone')
			}
			let user
			// Override logic
			if (shouldOverrideUnvalidatedRegister) {
				user = await UnverifiedUser
					.findOne(args.body.phone
						? {phone: args.body.phone}
						: {email: args.body.email})
					.exec()
				if (user) {
					Object.keys(args.body).forEach(key => {
						if (key != 'password') {
							user[key] = args.body[key]
						}
					})
				}
			}
			if (!user) {
				user = new UnverifiedUser(args.body)
			}
			user.setPassword(args.body.password)
			// TODO: Code generation mechanism
			const code = user.generateValidationCode()
			const saved = await user.save()
			if (!saved) {
				throw new Error('SaveError')
			}
			if (source && source.codeSender) {
				source.codeSender.send(code)
			}
			return idTransformer.encryptId(saved._id)
			//return Boolean(saved)
		}
	},

	sendValidationCode: {
		type: TokenType,
		args: {
			code: {
				name: 'code',
				type: new GraphQLNonNull(GraphQLString)
			},
			_id: {
				name: '_id',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		async resolve(source, args) {
			args._id = idTransformer.decryptId(args._id)
			const userToVerify = await UnverifiedUser
				.findById(args._id)
				.exec()
			if (!userToVerify) {
				throw new Error('UserNotFound')
			}
			if (!userToVerify.verify(args.code)) {
				throw Error('WrongCode')
			}
			const { result } = await AbstractUser.collection.updateAsync(
				{_id: userToVerify._id},
				UnverifiedUser.conversionCommand
			)
			if (result.n != 1 ||
				result.nModified != 1 ||
				result.ok != 1) {
				throw Error('Cannot convert user')
			}
			//const verified = userToVerify.createUser()
			const user = await User.findById(userToVerify._id).exec()

			// Remove the unverified
			/*userToVerify.remove()
			await userToVerify.save()
			const verified = await user.save()
			//TODO: consider backup or transaction
			if (!verified) {
				throw new Error('DirtyRemove')
			}*/
			return {
				token: user.generateToken(),
				daysToExpiry: User.TOKEN_TIME_TO_EXP
			}
		}
	},

	login: {
		type: TokenType,
		args: {
			body: {
				name: 'body',
				type: new GraphQLNonNull(LoginType)
			}
		},
		async resolve(source, args) {
			if (!args.body.phone && !args.body.email) {
				throw new Error('MissingCredentials: email or phone')
			}
			const user = await User
				.findOne(args.body.phone ? {phone: args.body.phone} : {email: args.body.email})
				.exec()
			if (!user || !user.validPassword(args.body.password)) {
				throw new Error('Wrong User or Password')
			}
			return {
				token: user.generateToken(),
				daysToExpiry: User.TOKEN_TIME_TO_EXP
			}
		}
	},

	changeProfileInfo: {
		type: ProfileType,
		args: {
			token: {
				name: 'token',
				type: GraphQLString
			},
			info: {
				name: 'info',
				type: new GraphQLNonNull(ProfileEdit),
			}
		},
		async resolve(source, args, _, info) {
			const selections = getProjection(info.fieldNodes)
			const {_id} = User.verifyToken(source.token || args.token)
			console.log('Called...')
			console.log('args', args.info)
			const user = await User
				.findOneAndUpdate(
					{_id},
					{$set: args.info},
					{new: true, select: selections})
				.exec()
			return encryptUserId(user)
		}
	},

	changePassword: {
		type: GraphQLBoolean,
		args: {
			oldPassword: {
				name: 'oldPassword',
				type: new GraphQLNonNull(PasswordType)
			},
			newPassword: {
				name: 'newPassword',
				type: new GraphQLNonNull(PasswordType)
			},
			token: {
				name: 'token',
				type: GraphQLString
			}
		},
		async resolve(source, args) {
			const { _id } = User.verifyToken(source.token || args.token)
			const user = await User.findById(_id).exec()
			if (!user.validPassword(args.oldPassword)) {
				throw Error('WrongPassword')
			}
			user.setPassword(args.newPassword)
			const saved = await user.save()
			return Boolean(saved)
		}
	},

	addFriend: {
		type: GraphQLBoolean,
		args: {
			token: {
				name: 'token',
				type: GraphQLString
			},
			_id: {
				name: '_id',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		async resolve(source, args) {
			args._id = idTransformer.decryptId(args._id)
			const { _id } = User.verifyToken(args.token || source.token)
			console.log(args._id)
			const requester = await User
				.findById(_id)
				.where('friendRequests').eq(args._id)
				.select('_id')
				.exec()
			if (requester) {
				throw Error('AlreadyRequested')
			}
			const {n, nModified} = await User.update(
				{$and: [{_id: args._id}, {friends: {$ne: _id} }]},
				{$addToSet: {friendRequests: _id}}
			).exec()
			if (!n) {
				throw Error('UserNotFound')
			}
			return Boolean(nModified)
		}
	},

	acceptFriend: {
		type: ProfileType,
		args: {
			token: {
				name: 'token',
				type: GraphQLString
			},
			_id: {
				name: '_id',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		async resolve(source, args, _, info) {
			args._id = idTransformer.decryptId(args._id)
			const selections = getProjection(info.fieldNodes)
			const { _id } = User.verifyToken(args.token || source.token)
			const { n, nModified } = await User
				.update({
					$and: [{_id}, {friendRequests: args._id}]
				}, {
					$addToSet: {friends: args._id},
					$pull: {friendRequests: args._id}
				})
				.exec()
			if (n == 0) {
				throw Error('NoRequest')
			}
			if (nModified == 0) {
				throw Error('AlreadyFriend')
			}
			let acceptedUser
			try {
				acceptedUser = await User
					.findByIdAndUpdate(
						args._id,
						{$addToSet: {friends: _id}},
						{new: true, select: selections}
					)
					.exec()
			} catch (err) {
				console.error(err)
				throw new Error('DirtyWrite')
			}
			return encryptUserId(acceptedUser.visibilityFilter('friend'))
		}
	},

	rejectFriend: {
		type: GraphQLBoolean,
		args: {
			token: {
				name: 'token',
				type: GraphQLString
			},
			_id: {
				name: '_id',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		async resolve(source, args) {
			args._id = idTransformer.decryptId(args._id)
			const { _id } = User.verifyToken(args.token || source.token)
			const { n, nModified } = await User.update(
				{$and: [{_id}, {friendRequests:  args._id }]},
				{$pull: {friendRequests: args._id}}
			).exec()
			if (n === 0) {
				throw Error('UserNotFound')
			}
			return Boolean(nModified)
		}
	},

	removeFriend: {
		type: GraphQLBoolean,
		args: {
			token: {
				name: 'token',
				type: GraphQLString
			},
			_id: {
				name: '_id',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		async resolve(source, args) {
			args._id = idTransformer.decryptId(args._id)
			const { _id } = User.verifyToken(args.token || source.token)
			const {n, nModified} = await User
				.update(
					{_id: {$in: [args._id, _id]}},
					{$pull: {friends: {$in: [args._id, _id]}}},
					{multi: true})
				.exec()
			if (n !== 2) {
				throw Error('One of users were removed')
			}
			if (nModified === 1) {
				throw new Error('DirtyWrite')
			}
			return Boolean(nModified===2)
		}
	},
	cancelFriendRequest: {
		type: GraphQLBoolean,
		args: {
			token: {
				name: 'token',
				type: GraphQLString
			},
			_id: {
				name: '_id',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		async resolve(source, args) {
			const { _id } = User.verifyToken(args.token || source.token)
			const {n, nModified} = await User
				.update({_id: idTransformer.decryptId(args._id)}, {$pull: {friendRequests: _id}})
				.exec()
			if (n === 0) {
				throw Error('UserNotFound')
			}
			return Boolean(nModified)
		}
	}
}