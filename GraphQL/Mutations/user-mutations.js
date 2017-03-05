import {
	RegistrationType,
	LoginType,
	TokenType
} from '../Types/user-types'

import AbstractUser from '../../Models/abstract-user'
import User from '../../Models/user'
import UnverifiedUser from '../../Models/unverified-user'
import { IdentityTransformer } from '../../Models/identy-transformer'


import {
	GraphQLBoolean,
	GraphQLID,
	GraphQLNonNull,
	GraphQLString
} from 'graphql'

const idTransformer = new IdentityTransformer()
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
			const userToVerify = await UnverifiedUser
				.findById(idTransformer.decryptId(args._id))
				.exec()
			if (!userToVerify) {
				throw new Error('UserNotFound')
			}
			if (!userToVerify.verify(args.code)) {
				throw Error('WrongCode')
			}
			const user = userToVerify.createUser()
			// Remove the unverified
			userToVerify.remove()
			await userToVerify.save()
			const verified = await user.save()
			//TODO: consider backup or transaction
			if (!verified) {
				throw new Error('DirtyRemove')
			}
			return {
				token: verified.generateToken(),
				daysToExpiry: AbstractUser.TOKEN_TIME_TO_EXP
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
				daysToExpiry: AbstractUser.TOKEN_TIME_TO_EXP
			}
		}
	},
}