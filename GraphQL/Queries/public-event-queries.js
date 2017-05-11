import PublicEvent from '../../Models/public-event'
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
	EventInvitationType, EventParticipantType
} from '../Types/event-types'
const idTransformer = new IdentityTransformer()
const eventTransformer = idTransformerToEventTransformer(idTransformer)
const userTransformer = idTransformerToUserTransformer(idTransformer)

export const viewer = {

	publicEvents: {
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
			participantNames: {
				name: 'participantNames',
				type: new GraphQLList(GraphQLString)
			},

			locationInfos: {
				name: 'locationInfos',
				type: new GraphQLList(GraphQLString)
			},

			eventTitles: {
				name: 'eventTitles',
				type: new GraphQLList(GraphQLString)
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
			if (!args.ignoreUntimed) { // TODO Understand why this is converse of the "events" query
				const ignoreTimeConstraint = {time: {$exists: Boolean(args.ignoreUntimed)}}
				if (Object.keys(timeConstraint).length === 0) {
					timeConstraint = ignoreTimeConstraint
				} else {
					timeConstraint = {$or: [timeConstraint, ignoreTimeConstraint, {autoUpdateFields: 'time'}]}
				}
			}

			function regexer(str) {
				return new RegExp(str, 'i')
			}

			//*** Other Constraints ***
			const {participantNames, locationInfos, eventTitles} = args
			const otherConstraints = {}
			if (participantNames) {
				otherConstraints['$where'] = `function(){
					return ${JSON.stringify(participantNames)}.map(${regexer}).some((rgx)=>
					Object.keys(this.userInfo).some((key)=>rgx.test(this.userInfo[key].name)))}` // TODO $lookup
			}
			if (locationInfos) {
				otherConstraints['location.info'] = {$in: locationInfos.map(regexer)}
			}
			if (eventTitles) {
				otherConstraints['title'] = {$in: eventTitles.map(regexer)}
			}

			const events = await PublicEvent
				.find(otherConstraints)
				.where(timeConstraint)
				.select(PublicEvent.selectionKeys(getProjection(info.fieldNodes)))
				.exec()

			return events
				.filter(event => {
					if (!event.time) {
						return !args.ignoreUntimed
					}
					if (!event.autoUpdateFields.includes('time')) {
						return true
					}
					return (!args.from || event.startTime >= args.from)
						&& (!args.to || event.endTime <= args.to)
				})
				.map(event => eventTransformer.encrypt(event.denormalize()))
		}
	}
}