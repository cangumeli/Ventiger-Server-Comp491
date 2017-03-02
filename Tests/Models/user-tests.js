//Setup babel for imports
require('source-map-support/register')
require('babel-core/register')

//Setup the model
const mongoose = require('mongoose')
mongoose.Promise = global.Promise
const User = require('../../Models/user').default

//Setup chai
const chai = require('chai')
chai.use(require('chai-as-promised'))
const expect = chai.expect

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

function populateDB() {
	return Promise.all(
		fields.map(field => {
			const user = new User(field)
			user.setPassword(field.password)
			return user.save()
		})
	)
}

describe("User", function () {
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
		before(populateDB)

		it("Retrieve the first user", function () {
			return expect(User
				.findOne({phone: fields[0].phone})
				.exec()
				.then(user => user.name))
				.to.eventually.equal(fields[0].name)
		})

		it('Retrieve the other user', function () {
			return expect(
				User
					.findOne({phone: fields[1].phone})
					.exec()
					.then(user => user.name))
				.to.eventually.equal(fields[1].name)

		})

		it('Phone Uniqueness', function (done) {
			const user = new User(fields[1])
			user.save(err => {
				err ? done() : done('Phone uniqueness failed')
			})
		})

		it('Email Uniqueness', function (done) {
			const user = new User(fields[2])
			user.save(err => {
				err ? done() : done('Email uniqueness failed')
			})
		})

		it('Discriminator Type', function () {
			return expect(User
				.findOne({phone: fields[0].phone})
				.exec()
				.then(user => user._type))
				.to.eventually.equal('User')
		})

		after(function () {
			mongoose.connection.db.dropDatabase()
		})
	})

	describe('password', function () {
		before(populateDB)

		const passwordTest = function (index) {
			return User
				.findOne({phone: fields[index].phone})
				.exec()
				.then(user => {
					expect(user.validPassword(fields[index].password))
						.to.equal(true)

					expect(user.validPassword(fields[index].password + 'c'))
						.to.equal(false)
				})
		}

		it('Correct and wrong password for the first user', function () {
			return passwordTest(0)
		})

		it('Correct and wrong password for the second user', function () {
			return passwordTest(1)
		})

		after(function () {
			return mongoose.connection.db.dropDatabase()
		})

	})

	describe('token', function () {
		let user, token
		before(function () {
			user = new User(fields[0])
			user.setPassword(fields[0].password)
		})

		it('sign and validate', function () {

			token = user.generateToken()
			let verified = User.verifyToken(token)
			let actual = {}, imagined = {}
			Object.keys(User.TOKEN_FIELDS).forEach(field => {
				actual[field] = user[field]
				imagined[field] = verified[field]
			})
			actual._id = actual._id.toString()
			expect(imagined).to.deep.equal(actual)
		})
	})
})
