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
			password: '1cabernet1',
			phone: '33333'
		},
		{
			name: 'u2',
			password: '2cabernet2',
			phone: '4444'
		},
		{
			name: 'u3',
			password: '3cabernet3',
			phone: '5555'
		}
	]

	
	describe('Event setup', function () {
		const events = [{
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
				mongoose.connect('mongodb://localhost/VentigerTest/:27017')
			}

			const saves = users.map((body) => {
				const user = new User(body)
				user.setPassword(body.password)
				return user.save()
				savedUsers.push(saved)
			})
			savedUsers = await Promise.all(saves)
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
				creator: {
					_id: idTransformer.encryptId(savedUsers[0]._id.toString()),
					name: savedUsers[0].name,
					admin: true
				}
			})
		})

		it('Event creation with fields', async() => {
			const event = {...events[1], invites:[savedUsers[1]._id]}
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
						invites {
							_id
							name
						}
					}
				}
			`, null, null, {body: event})
			const result = {...event, invites: [{_id: idTransformer.encryptId(savedUsers[1]._id), name: savedUsers[1].name}]}
			expect(res.errors).to.be.undefined
			expect(res.data.createEvent).to.deep.equal(result)
		})

		it('Successful event access', async () => {
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
			expect(res.data.events).to.deep.equal([
				{title: events[0].title}, {title: events[1].title}
			])
		})
	})
})