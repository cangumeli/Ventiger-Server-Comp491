import {
	GraphQLNonNull,
	GraphQLID,
	GraphQLString
} from 'graphql'

import {
	TodoType
} from '../Types/event-types'

import {
	idTransformerTodoTransformer,
	idTransformerToEventTransformer,
	idTransformerToUserTransformer
} from '../utils'

import IdTransformer from '../../Models/identy-transformer'
const idTransformer = new IdTransformer()
const eventTransformer = idTransformerToEventTransformer(idTransformer)
const userTransformer = idTransformerToUserTransformer(idTransformer)
const todoTransformer = idTransformerTodoTransformer(idTransformer)

function saveChannelNames(source, sn, cn, ucn) {
	try {
		source.channelNames[sn] = cn
		source.userChannelNames[sn] = ucn
	} catch (err){
		throw Error('UnsupportedTransport')
	}
}

export default {
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
				if (!source.dataPublished.addTodoSub) {
					return null
				}
				return todoTransformer.encrypt(source.dataPublished.addTodoSub)
			}
			saveChannelNames(source, 'addTodoSub', 'addTodo/' + eid, 'addTodo/' + args.eventId)
			return null
		}
	}
}