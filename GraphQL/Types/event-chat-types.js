import {
	GraphQLObjectType,
	GraphQLInputObjectType,
	GraphQLID,
	GraphQLString,
	GraphQLNonNull,
	GraphQLInt,
	GraphQLList,
	GraphQLBoolean
} from 'graphql'

import {
	GraphQLDateTime
} from 'graphql-custom-types'

export const ChatInputType = new GraphQLInputObjectType({
	name: 'EventChatInput',
	fields: {
		eventId: {type: new GraphQLNonNull(GraphQLID)},
		context: {type: new GraphQLNonNull(GraphQLString)}
	}
})

export const MessageInputType = new GraphQLInputObjectType({
	name: 'EventMessageInput',
	fields: {
		chatId: {type: new GraphQLNonNull(GraphQLID)},
		accessCode: {type: new GraphQLNonNull(GraphQLString)},
		content: {type: new GraphQLNonNull(GraphQLString)},
		sentAt: {type: GraphQLDateTime}
	}
})

export const MessageType = new GraphQLObjectType({
	name: 'EventMessage',
	fields: {
		_id: {type: GraphQLID},
		index: {type: GraphQLInt},
		content: {type: GraphQLString},
		sentAt: {type: GraphQLDateTime},
		removed: {type: GraphQLBoolean},
		sender: {type: GraphQLID}
	}
})

export const ChatType = new GraphQLObjectType({
	name: 'EventChat',
	fields: {
		_id: {type: GraphQLID},
		messageInc: {type: GraphQLInt},
		messages: {type: new GraphQLList(MessageType)},
		context: {type: GraphQLString},
		accessCode: {type: GraphQLString}
	}
})