import {
	RegistrationType
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
			const user = new UnverifiedUser(args.body)
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
		type: GraphQLString,
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
			//TODO: consider backup or transaction?
			if (!verified) {
				throw new Error('DirtyRemove')
			}
			return verified.generateToken()
		}
	}
}