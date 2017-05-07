import EventChat from '../../Models/event-chat'
import Event from '../../Models/event'
import {
	ChatType
} from '../Types/event-chat-types'
import {
	GraphQLList,
	GraphQLNonNull,
	GraphQLID,
	GraphQLString,
	GraphQLInt
} from 'graphql'
import { IdentityTransformer } from '../../Models/identy-transformer'
import { getProjection, encryptChat } from '../utils'
const idTransformer = new IdentityTransformer()

function indexMessages(chatObject, start) {
	let startIndex = start || 0
	chatObject.messages.forEach(m => {
		m.index = startIndex++
	})
}

export const viewer = {
	chats: {
		type: new GraphQLList(ChatType),
		args: {
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		async resolve(source, args, __, info) {
			const proj = getProjection(info.fieldNodes)
			const eid = idTransformer.decryptId(args.eventId)
			const event = await Event
				.findById(eid)
				.where({participants: source._id})
				.select('_id')
				.exec()
			if (!event) {
				throw Error('NoSuchEvent')
			}
			const chats = await EventChat
				.find({eventId: eid})
				.select({...proj, messageInc: 1})
				.exec()
			const res = chats.map(chat => encryptChat(idTransformer, chat))
			res.forEach(indexMessages)
			return res
		}
	},
	// TODO: constraint limits
	chat: {
		type: ChatType,
		args: {
			chatId: {
				name: 'chatId',
				type: new GraphQLNonNull(GraphQLID)
			},
			accessCode: {
				name: 'accessCode',
				type: new GraphQLNonNull(GraphQLString)
			},
			negativeOffset: {
				name: 'negativeOffset',
				type: GraphQLInt
			},
			limit: {
				name: 'limit',
				type: new GraphQLNonNull(GraphQLInt)
			}
		},
		async resolve(source, args, _, info) {
			const cid = idTransformer.decryptId(args.chatId)
			const proj = getProjection(info.fieldNodes)
			const sliceStart = -Math.abs(args.negativeOffset || 0) - args.limit
			const chat = await EventChat
				.findById(cid)
				.where({accessCode: args.accessCode})
				.select({messageInc: 1,...proj, messages: {$slice: [sliceStart, args.limit]}})
				.exec()
			if (!chat) {
				throw Error('NoSuchChat')
			}
			const chatObject = chat.toObject()
			indexMessages(chatObject, chat.messageInc + sliceStart)
			return encryptChat(idTransformer, chatObject)
		}
	}
}