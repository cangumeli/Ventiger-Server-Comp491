//Setup babel for imports
require('source-map-support/register')
require('babel-core/register')

//Setup the model
global.Test = {TTL: 1}
const mongoose = require('mongoose')
mongoose.Promise = global.Promise
const UnverifiedUser = require('../../Models/unverified-user').default

//Setup chai
const chai = require('chai')
chai.use(require('chai-as-promised'))
const expect = chai.expect

describe("UnverifiedUser", function () {
	// Setup the db connection and the model
	before(function () {
		if (mongoose.connection.readyState == 1
			|| mongoose.connection.readyState == 2) {
			return
		}
		mongoose.connect('mongodb://localhost/VentigerTest/:27017')
	})

	describe("#save", function () {
		//Populate the database

		before(function () {
			const user = new UnverifiedUser({
				name: 'can',
				phone: 'something',
			})
			user.setPassword('psw123')
			user.generateValidationCode({
				send: (c) => console.log(c)
			})
			return user.save()
		})


		it("Retrieve user", function () {
			return expect(UnverifiedUser
				.findOne({phone: 'something'})
				.exec()
				.then(user => user.name))
				.to.eventually.equal('can')
		})

		it('Discrimator type', function () {
			return expect(UnverifiedUser
				.findOne({phone: 'something'})
				.exec()
				.then(user => user._type))
				.to.eventually.equal('UnverifiedUser')
		})
	})


	/*describe('ttl', function () {
		it('TTL should remove user', function (done) {
			const user = new UnverifiedUser({
				name: 'can',
				phone: 'something2',
			})

			user.setPassword('psw123')
			user.generateValidationCode()
			user
				.save()
				.then(() => {
					setTimeout(function () {
						UnverifiedUser
							.findOne({phone: 'something2'})
							.exec((err, user) => {
								if (user) {
									return done('TTL test failed')
								}
								done()
							})
					}, 20000)
				})
		})
	})*/
	
	describe.skip('#verify', function () {
		global.Test.TTL = 10000000000000
		let code
		before(function () {
			const user = new UnverifiedUser({
				name: 'can',
				phone: 'something3',
			})
			user.setPassword('psw23d')
			code = user.generateValidationCode()
			return user.save()
		})

		it('Should verify validation code and convert itself', function (done) {
			UnverifiedUser
				.findOne({phone: 'something3'})
				.exec((err, user) => {
					if (err) {
						return done(err)
					}
					let ver = user.verify(code, true)
					expect(ver).to.equal(true)
					user
						.save()
						.then(user => {
							console.log(user._type)
							expect(user._type === 'User').to.equal(true)
							done()
						})
						.catch(err => done(err))
				})
		})
	})

	after(function () {
		return mongoose.connection.db.dropDatabase()
	})
})
