import Event from '../../Models/event'
import schema from '../../GraphQL/schema'
import { graphql } from 'graphql'
import User from '../../Models/user'
import { IdentityTransformer } from '../../Models/identy-transformer'
import mongoose from 'mongoose'
const chai = require('chai')
chai.config.truncateThreshold = 0
const expect = chai.expect
const idTransformer = new IdentityTransformer()
import { idTransformerToEventTransformer } from '../../GraphQL/utils'
const eventTransformer = idTransformerToEventTransformer(idTransformer)


describe('Event API Tests', function () {
	const users = [
		{
			name: 'u1',
			password: '1pass1',
			phone: '33333'
		},
		{
			name: 'u2',
			password: '2pass2',
			phone: '4444'
		},
		{
			name: 'u3',
			password: '3pass3',
			phone: '5555'
		}
	]

	
	describe('Event setup', function () {
		const events = [
			{
				title: "Rakı"
			},
			{
				title: "Fields",
				time: {startTime: new Date(), endTime: new Date()},
				location: {
					info: "info",
					coordinates: [3, 5],
					address: "No 3"
				}
			}
		]
		let savedUsers = [], token
		before(async() => {
			if (mongoose.connection.readyState !== 1 &&
				mongoose.connection.readyState !== 2) {
				mongoose.Promise = global.Promise
				mongoose.connect('mongodb://localhost/VentigerTest/:27017')
			}

			const saves = users.map((body) => {
				const user = new User(body)
				user.setPassword(body.password)
				return user.save()
			})
			savedUsers = await Promise.all(saves)
			savedUsers[0].friends.push(savedUsers[1]._id)
			savedUsers[1].friends.push(savedUsers[0]._id)
			savedUsers[0] = await savedUsers[0].save()
			savedUsers[1] = await savedUsers[1].save()
			token = savedUsers[0].generateToken()
		})

		it('Event creation', async() => {
			const res = await graphql(schema, `
				mutation ($body: EventBody!){
					createEvent(body: $body, token: "${token}") {
						title
						creator {
							_id
							name
							admin
						}
					}
				}
			`, null, null, {body: events[0]})
			expect(res.errors).to.be.undefined
			expect(res.data.createEvent).to.deep.equal({
				...events[0],
				voters: {
					_id: idTransformer.encryptId(savedUsers[0]._id.toString()),
					name: savedUsers[0].name,
					admin: true
				}
			})
		})

		it('Event creation with fields', async() => {
			const event = {...events[1]}
			const res = await graphql(schema, `
				mutation ($body: EventBody!){
					createEvent(body: $body, token: "${token}") {
						title
						time {
							startTime
							endTime
						}
						location {
							address
							info
							coordinates
						}
						participants{
							name
							admin
						}
					}
				}
			`, null, null, {body: event})
			const result = {...event,
				participants: [{name: savedUsers[0].name, admin: true}],}
				//invites: [{_id: idTransformer.encryptId(savedUsers[1]._id), name: savedUsers[1].name}]}
			expect(res.errors).to.be.undefined
			expect(res.data.createEvent).to.deep.equal(result)
		})

		it('Successful events access', async () => {
			const res = await graphql(schema, `
				query {
					viewer(token: "${token}") {
						events {
							title
						}
					}
				}
			`)
			expect(res.errors).to.be.undefined
			expect(res.data.viewer.events).to.deep.equal([
				{title: events[0].title}, {title: events[1].title}
			])
		})

		it('Successful event access', async () => {
			const event = await Event.findOne({title: events[1].title}).exec()
			const { _id } = eventTransformer.encrypt(event)
			const res = await graphql(schema, `
				query {
					viewer(token: "${token}") {
						event(_id: "${_id}") {
							title
						time {
							startTime
							endTime
						}
						location {
							address
							info
							coordinates
						}
						participants{
							name
							admin
						}
					}
				}
			}`)
			expect(res.errors).to.be.undefined
			const result = {...events[1],
				participants: [{name: savedUsers[0].name, admin: true}],}
				//invites: [{_id: idTransformer.encryptId(savedUsers[1]._id), name: savedUsers[1].name}]}
			expect(res.data.viewer.event).to.deep.equal(result)
		})

		it('Unauthorized event access', async () => {
			const event = await Event.findOne({title: events[1].title}).exec()
			const { _id } = eventTransformer.encrypt(event)
			const token = savedUsers[1].generateToken()
			const res = await graphql(schema, `
				query {
					viewer(token: "${token}") {
						event(_id: "${_id}") {
							title	
						}
					}
				}`)
			expect(res.errors[0].message).to.equal('NoSuchEvent')
		})

		it('Successful event invitation', async () => {
			const { _id } = await Event.findOne({title: events[0].title}).exec()
			const res = await graphql(schema, `
				mutation {
					inviteToEvent(token: "${token}" eventId: "${idTransformer.encryptId(_id.toString())}", 
						userIds: ["${idTransformer.encryptId(savedUsers[1]._id.toString())}", "${idTransformer.encryptId(savedUsers[2]._id.toString())}"])
				}
			`)
			expect(res.errors).to.be.undefined
			expect(res.data.inviteToEvent).to.equal(true)
		})

		it('Should see invitations', async () => {
			token = savedUsers[1].generateToken()
			const res = await graphql(schema, `
				query {
					viewer(token: "${token}") {
						eventInvitations {
							title
							invitor {
								name
							}
						}
					}
				}
			`)
			expect(res.errors).to.be.undefined
			expect(res.data.viewer.eventInvitations).to.deep.equal([{title: events[0].title,
				invitor: {name: savedUsers[0].name}}]
			)
		})

		it('Should be able to accept an invitation', async () => {
			const { _id } = await Event.findOne({title: events[0].title}).exec()
			console.log("Token ", token)
			const res = await graphql(schema, `
				mutation {
					acceptEventInvitation(token: "${token}", eventId: "${idTransformer.encryptId(_id)}") {
						title
					}
				}	
			`)
			expect(res.errors).to.be.undefined
			expect(res.data.acceptEventInvitation.title).to.equal(events[0].title)
		})

		it('Event shall be mine', async () => {
			const { _id } = await Event.findOne({title: events[0].title}).exec()
			const res = await graphql(schema, `
				query {
					viewer(token: "${token}") {
						event(_id: "${idTransformer.encryptId(_id)}") {
							title
							participants {
								name
							}
						}
					}
				}`)
			console.log("mine ", res.data.viewer.event, " ", savedUsers[1]._id)
			expect(res.errors).to.be.undefined
			expect(res.data.viewer.event.title).to.equal(events[0].title)
		})

		it('Should be able to reject an invitations', async () => {
			token = savedUsers[2].generateToken()
			let { _id } = await Event.findOne({title: events[0].title}).exec()
			_id = idTransformer.encryptId(_id)
			const res = await graphql(schema, `
				mutation {
					rejectEventInvitation(token: "${token}", eventId: "${_id}")
				}
			`)
			expect(res.errors).to.be.undefined
			expect(res.data.rejectEventInvitation).to.equal(true)
		})

		it('Event invitations should be cleaned after accept and reject', async () => {
			const res = await graphql(schema, `
				query {
					viewer(token: "${token}") {
						eventInvitations {
							title
						}
					}
				}
			`)
			expect(res.errors).to.be.undefined
			expect(res.data.viewer.eventInvitations).to.deep.equal([])
		})

		it('Event should be left successfully', async () => {
			token = savedUsers[1].generateToken()
			let { _id } = await Event.findOne({title: events[0].title}).exec()
			const res = await graphql(schema, `
				mutation {
					leaveEvent(token: "${token}", eventId: "${idTransformer.encryptId(_id)}")
				}
			`)
			expect(res.errors).to.be.undefined
			expect(res.data.leaveEvent).to.equal(true)
			const res2 = await graphql(schema, `
				query {
					viewer(token: "${token}") {
						events {
							title
						}
					}
				}
			`)
			expect(res2.data.viewer.events).to.deep.equal([])
		})
	})

})