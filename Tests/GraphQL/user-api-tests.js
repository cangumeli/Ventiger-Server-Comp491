//Setup babel for imports
require('source-map-support/register')
require('babel-core/register')
const mongoose = require('mongoose')
const graphql = require('graphql').graphql
const schema = require('../../GraphQL/schema').default
const UnverifiedUser = require('../../Models/unverified-user').default
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

	describe('#register', function () {

		it('Successful return', function () {

			return expect(graphql(schema, `
				mutation Registration($body: RegistrationBody!){
				register(body: $body)
			}`, null, null, {body})
				.then(res => {
					console.log(res)
					return res.data
				}))
				.to.eventually.have.property('register')
		})
		
		it('User saved to database', function () {
			return expect(UnverifiedUser
				.findOne({email: body.email})
				.exec()
				.then(user => { return {name: user.name, email: user.email} }))
				.to.eventually.deep.equal({name: body.name, email: body.email})
		})
	})

	after(function () {
		//return mongoose.connection.db.dropDatabase()
	})
})