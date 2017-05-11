import Event from '../../Models/event'
import {
	getProjection,
	idTransformerToEventTransformer,
	idTransformerToUserTransformer
} from '../utils'
import {IdentityTransformer} from '../../Models/identy-transformer'
import {
	GraphQLString,
	GraphQLID,
	GraphQLNonNull,
	GraphQLList,
	GraphQLBoolean
} from 'graphql'
import {GraphQLDateTime} from 'graphql-custom-types'
import {
	EventType,
	EventInvitationType
} from '../Types/event-types'
const idTransformer = new IdentityTransformer()
const eventTransformer = idTransformerToEventTransformer(idTransformer)
const userTransformer = idTransformerToUserTransformer(idTransformer)

export const viewer = {
	// TODO: autoupdate logic for time filtering
	events: {
		type: new GraphQLList(EventType),
		args: {
			from: {
				name: 'from',
				type: GraphQLDateTime
			},
			to: {
				name: 'to',
				type: GraphQLDateTime
			},
			ignoreUntimed: {
				name: 'ignoreUntimed',
				type: GraphQLBoolean
			},
		},
		async resolve(source, args, __, info) {
			let timeConstraint = {}
			if (args.from) {
				timeConstraint['time.startTime'] = {$gte: args.from}
			}
			if (args.to) {
				timeConstraint['time.endTime'] = {$lte: args.to}
			}
			if (args.ignoreUntimed) {
				const ignoreTimeConstraint = {time: {$exists: Boolean(args.ignoreUntimed)}}
				if (Object.keys(timeConstraint).length === 0) {
					timeConstraint = ignoreTimeConstraint
				} else {
					timeConstraint = {$or: [timeConstraint, ignoreTimeConstraint, {autoUpdateFields:'time'}]}
				}
			}
			const events = await Event
				.find({participants: source._id})
				.where(timeConstraint)
				.select(Event.selectionKeys(getProjection(info.fieldNodes)))
				.exec()
			// console.log('Event ', events
			// 	.filter(event => {
			// 		if (!event.time) {
			// 			return !args.ignoreUntimed
			// 		}
			// 		if (!event.autoUpdateFields.some(c=>c==='time')) {
			// 			return true
			// 		}
			// 		return (!args.from || event.startTime >= args.from)
			// 			&& (!args.to || event.endTime <= args.to)
			// 	}), ' \nme ', source)
			//events.forEach(event => event.denormalize())
			return events
				.filter(event => {
					if (!event.time) {
						return !args.ignoreUntimed
					}
					if (!event.autoUpdateFields.some(c=>c==='time')) {
						return true
					}
					return (!args.from || event.startTime >= args.from)
						&& (!args.to || event.endTime <= args.to)
				})
				.map(event => eventTransformer.encrypt(event.denormalize()))
		}
	},
	event: {
		type: EventType,
		args: {
			_id: {
				name: '_id',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		async resolve(source, args, __, info) {
			const event = await Event
				.findOne({
					$and: [{_id: idTransformer.decryptId(args._id)}, {participants: source._id}]
				})
				.select(Event.selectionKeys(getProjection(info.fieldNodes)))
				.exec()
			if (!event) {
				throw Error('NoSuchEvent')
			}
			console.log('Creator ', eventTransformer.encrypt(event.denormalize()).creator)
			return eventTransformer.encrypt(event.denormalize())
		}
	},
	eventInvitations: {
		type: new GraphQLList(EventInvitationType),
		async resolve(source, args, __, info) {
			const proj = getProjection(info.fieldNodes)
			const events = await Event
				.find({invites: source._id})
				.select(Event.selectionKeys(proj))
				.exec()
			for (let i = 0; i < events.length; ++i) {
				events[i] = eventTransformer.encrypt(events[i])
				events[i].invitor = userTransformer.encryptUser(events[i].userInfo[events[i].userInfo[source._id].invitor])
			}
			//console.log("\nevent asd",Object.keys(events[0] || {}))// && events[0].toObject())
			return events
		}
	}
}