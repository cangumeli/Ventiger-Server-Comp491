import EventChat from '../../Models/event-chat'
import User from '../../Models/user'
import Event from '../../Models/event'
import {
	ChatInputType,
	ChatType,
	MessageType,
	MessageInputType
} from '../Types/event-chat-types'

import {
	GraphQLString,
	GraphQLNonNull,
	GraphQLID,
	GraphQLInt,
	GraphQLBoolean
} from 'graphql'
import { IdentityTransformer } from '../../Models/identy-transformer'
import { encryptMessage } from '../utils'
const idTransformer = new IdentityTransformer()

export default {
	createChat: {
		type: ChatType,
		args: {
			body: {
				name: 'body',
				type: new GraphQLNonNull(ChatInputType)
			},
			token: {
				name: 'body',
				type: GraphQLString
			}
		},
		async resolve(source, args) {
			const me = User.verifyToken(args.token || source.token)
			const eid = idTransformer.decryptId(args.body.eventId)
			const event = await Event.findById(eid).where({participants: me._id}).select('_id').exec()
			if (!event) {
				throw Error('NoSuchEvent')
			}
			const chat = new EventChat({...args.body, eventId: eid})
			chat.generateAccessCode()
			const saved = await chat.save()
			const res = saved.toObject()
			if (source.pubsub) {
				source.pubsub.publish('createChat/' + eid, {chat: res})
			}
			res._id = idTransformer.encryptId(res._id.toString())
			return res
		}
	},
	sendMessage: {
		type: MessageType,
		args: {
			body: {
				name: 'body',
				type: new GraphQLNonNull(MessageInputType)
			},
			token: {
				name: 'token',
				type: GraphQLString
			}
		},
		async resolve(source, args) {
			const me = User.verifyToken(args.token || source.token)
			const cid = idTransformer.decryptId(args.body.chatId)
			const chat = await EventChat
				.findOneAndUpdate(
					{_id: cid, accessCode: args.body.accessCode},
					{
						$push: {messages: {...args.body, sender: me._id}},
						$inc: {messageInc: 1}
					},
					{ new: true, select: {messageInc: 1, messages: {$slice: -1}}}
				)
				.exec()
			if (!chat) {
				throw Error('NoSuchChat')
			}
			const message = chat.messages[chat.messages.length-1].toObject()
			message.index = chat.messageInc - 1
			if (source.pubsub) {
				source.pubsub.publish('sendMessage/' + cid, message)
				source.pubsub.publish('messageInc/' + cid, {messageInc: chat.messageInc})
			}
			return encryptMessage(idTransformer, message)
			/*message.sender = idTransformer.encryptId(message.sender.toString())
			message._id = idTransformer.encryptId(message._id.toString())
			return message*/
		}
	},

	removeMessage: {
		type: GraphQLBoolean,
		args: {
			token: {
				name: 'token',
				type: GraphQLString
			},
			chatId: {
				name: 'chatId',
				type: new GraphQLNonNull(GraphQLID)
			},
			messageIndex: {
				name: 'messageIndex',
				type: new GraphQLNonNull(GraphQLInt)
			}
		},
		async resolve(source, args) {
			const me = User.verifyToken(args.token || source.token)
			const cid = idTransformer.decryptId(args.chatId)
			const i = args.messageIndex
			const chat = await EventChat.findById(cid).select('messages').exec()
			if (!chat.messages[i] || chat.messages[i].sender.toString() !== me._id.toString()) {
				throw Error('NoSuchMessage')
			}
			const {nModified} = await EventChat
				.update(
					{_id: cid},
					{
						$set: {[`messages.${i}.removed`]: true},
						$unset: {[`messages.${i}.content`]: "", [`messages.${i}.sender`]: ""}
					}
				)
				.exec()
			if (nModified && source.pubsub) {
				source.pubsub.publish('removeMessage/'+cid, {index: i})
			}
			return Boolean(nModified)
		}
	}
}