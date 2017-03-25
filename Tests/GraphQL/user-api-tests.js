//Setup babel for imports
require('source-map-support/register')
require('babel-core/register')
const mongoose = require('mongoose')
const graphql = require('graphql').graphql
const schema = require('../../GraphQL/schema').default
const UnverifiedUser = require('../../Models/unverified-user').default
const AbstractUser = require('../../Models/abstract-user').default
const User = require('../../Models/user').default
const chai = require('chai')
chai.config.truncateThreshold = 0
chai.use(require('chai-as-promised'))
const expect = chai.expect

const body = {
	name: "User Useroğlu",
	password: "somehighlysecurepassword",
	email: 'uuoglu17@ku.edu.tr',
}

import {idTransformerToUserTransformer} from '../../GraphQL/utils'
import {IdentityTransformer} from '../../Models/identy-transformer'

const idTransformer = new IdentityTransformer()
const {encryptUser: encryptUserId, decryptUser: decryptUserId} = idTransformerToUserTransformer(idTransformer)

describe('User API Test', function () {

	before(function () {
		if (mongoose.connection.readyState == 1
			|| mongoose.connection.readyState == 2) {
			return
		}
		mongoose.connect('mongodb://localhost/VentigerTest/:27017')
	})

	describe('Registration', function () {
		describe('Success', function () {
			let code = null
			let res = {}

			before(function () {
				return graphql(schema, `mutation Registration($body: RegistrationBody!){
					register(body: $body)
				}`, {
						codeSender: {
							send(_code) {
								code = _code
							}
						}
					},
					null, {body}
				).then(_res => {
					res = _res
				})
			})

			it('Successful return', function () {
				//console.log(res)
				expect(Boolean(res.data && res.data.register)).to.equal(true)
			})

			it('User saved to database', function () {
				return expect(UnverifiedUser
					.findOne({email: body.email})
					.exec()
					.then(user => {
						return {name: user.name, email: user.email}
					}))
					.to.eventually.deep.equal({name: body.name, email: body.email})
			})

			it('sendValidationCode should give the correct output', function () {
				return expect(graphql(schema, `mutation {
					sendValidationCode(code: "${code}", _id: "${res.data.register}") {
						token,
						daysToExpiry
					}
				}`)
					.then(res => {
						return Boolean(
							res.data
							&& res.data.sendValidationCode
							&& res.data.sendValidationCode.token
							&& (res.data.sendValidationCode.daysToExpiry === User.TOKEN_TIME_TO_EXP))
					}))
					.to.eventually.equal(true)
			})

			it('After send validation code, user should be saved', function () {
				return expect(User
					.findOne({email: body.email})
					.exec()
					.then(user => {
						// console.log(user)
						if (user == null) {
							return {}
						}
						return {name: user.name, email: user.email}
					}))
					.to.eventually.deep.equal({name: body.name, email: body.email})
			})

		})
		// TODO: More failure tests?
	})
	
	describe('Profile reaching tests', function () {
		const fields = [{
			phone: '05059309494',
			name: 'Can Gümeli',
			password: 'c01234b'
		}, {
			phone: '1111',
			name: 'Something Something',
			password: 'a0123492'
		}, {
			email: 'something@something',
			name: 'Ata Keşfeden',
			password: 'asdsdsd'
		}]

		const users = []

		function populateDB() {
			return Promise.all(
				fields.map(field => {
					const user = new User(field)
					users.push(user)
					user.setPassword(field.password)
					return user.save()
				})
			)
		}

		before(populateDB)

		it("Reach correct user with token", function () {
			const token = users[0].generateToken()
			const body = {
				name: users[0].name,
				phone: users[0].phone
			}
			//console.log(body)
			return expect(graphql(schema, `
				query {
					viewer(token: "${token}") {
						profile {
							name,
							phone
						}
					}
				}
			`)
				.then(res => {
					//console.log("res", res.data.viewer.profile)
					return res.data.viewer.profile
				}))
				.to.eventually.deep.equal(body)
		})

	})
	
	describe("Friendship", function () {
		const bodies = [
			{name: 'us', phone: '110'},
			{name: 'friend', phone: '11881'},
			{name: 'enemy', phone: '11882'}
		]

		let token, savedUsers
		before(async function () {
			const users = bodies.map((body) => {
				const user = new User(body)
				user.setPassword('atacan')
				return user
			})
			await Promise.all(users.map(user => user.save()))
			const us = await User.findOne({phone: bodies[0].phone}).exec()
			token = us.generateToken()
			savedUsers = await User.find({phone: {$in: bodies.map(body => body.phone)}}).exec()
		})

		it('Friend should be added successfully', async function () {
			const result = await graphql(schema, `
				mutation {
					addFriend(token: "${token}", _id: "${encryptUserId(savedUsers[1])._id}")
				}
			`)
			//console.log('friend result', result)
			expect(result.errors).to.equal(undefined)
			expect(result.data.addFriend).to.equal(true)

		})

		it('Friend requests should be seen', async function () {
			token = savedUsers[1].generateToken()
			const res = await graphql(schema, `
				query {
					viewer(token: "${token}") {
						friendRequests {
							name
							_id
							phone
						}
					}
				}
			`)
			expect(res.errors).to.equal(undefined)
			expect(res.data.viewer.friendRequests).to.deep.equal([{
				name: savedUsers[0].name,
				_id: savedUsers[0]._id.toString(),
				phone: null
			}].map(encryptUserId))
		})

		it('Friend acceptance', async function () {
			const result = await graphql(schema, `
				mutation {
					acceptFriend(token: "${token}", _id: "${encryptUserId(savedUsers[0])._id}") {
						_id
						name
					}
				}
			`)
			expect(result.errors).to.equal(undefined)
			expect(result.data.acceptFriend).to.deep.equal(
				encryptUserId({
					_id: savedUsers[0]._id.toString(),
					name: savedUsers[0].name
				}))
		})

		it('Added friend should be seen by acceptor', async function () {
			const result = await graphql(schema, `
				query {
					viewer(token: "${token}") {
						friends {
							_id
							name
						}
					}
				}
			`)
			console.log('result friends', result)
			expect(result.errors).to.equal(undefined)
			expect(result.data.viewer.friends).to.deep.equal([{
				name: savedUsers[0].name,
				_id: savedUsers[0]._id.toString()
			}].map(encryptUserId))
		})

		it('Friend requests should be empty', async() => {
			const result = await graphql(schema, `
			query {
				viewer(token: "${token}") {
					friendRequests {
						name
					}
				}
			}`)
			expect(result.data.viewer.friendRequests).to.deep.equal([])
		})

		it('Request sender should see the accepted friend', async() => {
			token = savedUsers[0].generateToken()
			const res = await graphql(schema, `
				query {
					viewer(token: "${token}") {
						friends {
							_id
							name
						}
					}
				}
			`)
			expect(res.data.viewer.friends).to.deep.equal([
				{
					name: savedUsers[1].name,
					_id: savedUsers[1]._id.toString()
				}
			].map(encryptUserId))
		})

		it('rejectFriend should return correct response', async() => {
			let token = savedUsers[0].generateToken()
			await graphql(schema, `
				mutation {
					addFriend(token: "${token}", _id: "${encryptUserId(savedUsers[2])._id}")
				}
			`)
			token = savedUsers[2].generateToken()
			let result = await graphql(schema, `
				mutation {
					rejectFriend(token: "${token}", _id: "${encryptUserId(savedUsers[0])._id}")
				}
			`)
			expect(result.errors).to.be.undefined
			expect(result.data.rejectFriend).to.equal(true)
		})
		it('Should be deleted silently when rejected', async ()=> {
			let result = await
			graphql(schema, `
			query {
				viewer(token: "${token}") {
					friendRequests {
						name
					}
				}
			}`)
			expect(result.errors).to.be.undefined
			expect(result.data.viewer.friendRequests).to.deep.equal([])
		})
	})

	describe('Relationship', function () {
		const bodies = [
			{name: 'user1', phone: '5110'},
			{name: 'user2', phone: '511881'},
			{name: 'user3', phone: '5433'},
			{name: 'user4', phone: '511882'},
			{name: 'user5', phone: '511883'}
		]

		let token, savedUsers, us
		before(async function () {
			const users = bodies.map((body) => {
				const user = new User(body)
				user.setPassword('atacan')
				return user
			})
			await Promise.all(users.map(user => user.save()))
			savedUsers = await User.find({phone: {$in: bodies.map(body => body.phone)}}).exec()

			us = savedUsers[0]


			us.friends.push(savedUsers[1]._id)
			savedUsers[1].friends.push(us._id)

			await us.save()
			await savedUsers[1].save()

			token = savedUsers[3].generateToken()
			await graphql(schema, `
				mutation {
					addFriend(token: "${token}", _id: "${encryptUserId(us)._id}")
				}
			`)

			token = us.generateToken()
			await graphql(schema, `
				mutation {
					addFriend(token: "${token}", _id: "${encryptUserId(savedUsers[2])._id}")
				}
			`)
		})
		it('should return correct relations', async function () {
			token = us.generateToken()
			const encryptedSavedUsers = savedUsers.map(encryptUserId)
			const testCases = [
				{id: encryptedSavedUsers[0]._id, relation: User.RELATIONS.MYSELF.value},
				{id: encryptedSavedUsers[1]._id, relation: User.RELATIONS.FRIEND.value},
				{id: encryptedSavedUsers[2]._id, relation: User.RELATIONS.REQUESTER.value},
				{id: encryptedSavedUsers[3]._id, relation: User.RELATIONS.REQUESTED.value},
				{id: encryptedSavedUsers[4]._id, relation: User.RELATIONS.NOBODY.value}
			]

			for(let i = 0; i < testCases.length; i++){
				let testCase = testCases[i]
				let result = await graphql(schema, `
					query {
						viewer(token: "${token}") {
							relation(_id: "${testCase.id.toString()}")
						}
					}`)
				expect(result.errors).to.be.undefined
				expect(result.data.viewer.relation).to.equal(testCase.relation)
			}
		})
	})

	after(function () {
		//return UnverifiedUser.remove({}, {multi: true}).exec()
		return mongoose.connection.db.dropDatabase()
	})
})