import IdentityTransformer from '../../Models/identy-transformer'
import EventChat from '../../Models/event-chat'
import User from '../../Models/user'
import Event from '../../Models/event'
import {
	ChatType,
	MessageType
} from '../Types/event-chat-types'
import {
	GraphQLID,
	GraphQLNonNull,
	GraphQLInt,
	GraphQLString
} from 'graphql'
import { encryptChat, encryptMessage } from '../utils'

const idTransformer = new IdentityTransformer()

function saveChannelNames(source, sn, cn, ucn) {
	try {
		source.channelNames[sn] = cn
		source.userChannelNames[sn] = ucn
	} catch (err){
		return
	}
}

export default {
	createChatSub: {
		type: ChatType,
		args: {
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			},
			// TODO: hierarchical subscripions
			token: {
				name: 'token',
				type: GraphQLString
			}
		},
		async resolve(source, args) {
			if (source.dataPublished && source.dataPublished.createChatSub) {
				return encryptChat(idTransformer, source.dataPublished.createChatSub.chat)
			}
			const eid = idTransformer.decryptId(args.eventId)
			const me = User.verifyToken(args.token || source.token)
			const event = await Event.findById(eid).where({participants: me._id}).select('_id').exec()
			if (!event) {
				throw Error('NoSuchEvent')
			}
			saveChannelNames(source, 'createChatSub', 'createChat/'+eid, 'createChat/'+args.eventId)
			return null
		}
	},
	messageIncSub: {
		type: GraphQLInt,
		args: {
			chatId: {
				name: 'chatId',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		resolve(source, args) {
			const cid = idTransformer.decryptId(args.chatId)
			if (source.dataPublished && source.dataPublished.messageIncSub) {
				return Number(source.dataPublished.messageIncSub.messageInc)
			}
			saveChannelNames(source, 'messageIncSub', 'messageInc/'+cid, 'messageInc/'+args.chatId)
			return null
		}
	},
	sendMessageSub: {
		type: MessageType,
		args: {
			chatId: {
				name: 'chatId',
				type: new GraphQLNonNull(GraphQLID)
			},
			accessCode: {
				name: 'accessCode',
				type: new GraphQLNonNull(GraphQLString)
			}
		},
		async resolve(source, args) {
			const cid = idTransformer.decryptId(args.chatId)
			if (source.dataPublished && source.dataPublished.sendMessageSub) {
				const chat = await EventChat.findById(cid).where({accessCode: args.accessCode}).select('_id').exec()
				if (!chat) {
					throw Error('NoSuchChat')
				}
				return encryptMessage(idTransformer, source.dataPublished.sendMessageSub)
			}
			saveChannelNames(source, 'sendMessageSub', 'sendMessage/'+cid, 'sendMessage/'+args.chatId)
			return null
		}
	},
	removeMessageSub: {
		type: GraphQLInt, // Index of the message
		args: {
			chatId: {
				name: 'chatId',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		resolve(source, args) {
			if (source.dataPublished && source.dataPublished.removeMessageSub) {
				return source.dataPublished.removeMessageSub.index
			}
			const cid = idTransformer.decryptId(args.chatId)
			saveChannelNames(source, 'removeMessageSub', 'removeMessage/'+cid, 'removeMessage/'+args.chatId)
			return null
		}
	}
}

