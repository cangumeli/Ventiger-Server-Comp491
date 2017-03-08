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
chai.use(require('chai-as-promised'))
const expect = chai.expect

require('../../db')
const body = {
	name: "Attila Gürsoy",
	password: "1cabernet1",
	email: 'agursoy@ku.edu.tr',
}


describe('User API Test', function () {

	before(function () {
		if (mongoose.connection.readyState == 1
			|| mongoose.connection.readyState == 2) {
			return
		}
		mongoose.connect('mongodb://localhost/VentigerTest/:27017')
	})

	describe('Registration', function () {
		describe('Success', function() {
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
						// console.log(res)
						return Boolean(
							res.data
							&& res.data.sendValidationCode
							&& res.data.sendValidationCode.token
							&& (res.data.sendValidationCode.daysToExpiry == AbstractUser.TOKEN_TIME_TO_EXP))
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

	after(function () {
		//return UnverifiedUser.remove({}, {multi: true}).exec()
		return mongoose.connection.db.dropDatabase()
	})
})