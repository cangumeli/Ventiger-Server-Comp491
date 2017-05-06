import {
	GraphQLNonNull,
	GraphQLID,
	GraphQLString,
	GraphQLList,
} from 'graphql'

import {
	EventUpdateOutputType,
	TodoType,
	PollType
} from '../Types/event-types'

import {
	idTransformerTodoTransformer,
	idTransformerToEventTransformer,
	idTransformerToUserTransformer,
	idTransformerToPollTransformer
} from '../utils'

import IdTransformer from '../../Models/identy-transformer'
const idTransformer = new IdTransformer()
const eventTransformer = idTransformerToEventTransformer(idTransformer)
const userTransformer = idTransformerToUserTransformer(idTransformer)
const todoTransformer = idTransformerTodoTransformer(idTransformer)
const pollTransformer = idTransformerToPollTransformer(idTransformer)

function saveChannelNames(source, sn, cn, ucn) {
	console.log('scn', source.userChannelNames)
	console.log('cn', source.channelNames)
	try {
		source.channelNames[sn] = cn
		source.userChannelNames[sn] = ucn
	} catch (err){
		return
	}
}

export default {
	updateEventSub: {
		type: EventUpdateOutputType,
		args: {
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		resolve(source, args) {
			// TODO: add authorization logic
			if (!args.eventId) {
				throw Error('NoArguments')
			}
			const eid = idTransformer.decryptId(args.eventId)
			const update = source.dataPublished && source.dataPublished.updateEventSub
			if (update) {
				return eventTransformer.encrypt({...update, _id: eid})
			}
			saveChannelNames(
				source,
				'updateEventSub',
				'updateEvent/'+eid,
				'updateEvent/'+args.eventId)
			return null
		}
	},
	addTodoSub: {
		type: TodoType,
		args: {
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			},
		},
		resolve(source, args) {
			const eid = idTransformer.decryptId(args.eventId)
			if (source.dataPublished) {
				console.log('here')
				if (!source.dataPublished.addTodoSub) {
					return null
				}
				return todoTransformer.encrypt(source.dataPublished.addTodoSub)
			}
			console.log('there')
			saveChannelNames(source, 'addTodoSub', 'addTodo/' + eid, 'addTodo/' + args.eventId)
			return null
		}
	},
	performTodoActionSub: {
		type: TodoType,
		args: {
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		resolve(source, args) {
			if (source.dataPublished && source.dataPublished.performTodoActionSub) {
				console.log('Todo Sub Data ', source.dataPublished.performTodoActionSub)
				return todoTransformer.encrypt(source.dataPublished.performTodoActionSub)
			}
			const eid = idTransformer.decryptId(args.eventId)
			saveChannelNames(source, 'performTodoActionSub', 'performTodoAction/'+eid, 'performTodoAction/'+args.eventId)
			return null
		}
	},
	createPollSub: {
		type: PollType,
		args: {
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		resolve(source, args) {
			if (source.dataPublished && source.dataPublished.createPollSub) {
				return pollTransformer.encrypt(source.dataPublished.createPollSub)
			}
			const eid = idTransformer.decryptId(args.eventId)
			saveChannelNames(source, 'createPollSub', 'createPoll/' + eid, 'createPoll/' + args.eventId)
			return null
		}
	}
}