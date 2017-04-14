import {
	GraphQLID,
	GraphQLString,
	GraphQLFloat,
	GraphQLList,
	GraphQLInputObjectType,
	GraphQLNonNull,
	GraphQLObjectType,
	GraphQLBoolean,
	GraphQLInt,
	GraphQLEnumType
} from 'graphql'

import {
	GraphQLDateTime
} from 'graphql-custom-types'

const timeFields = {
	startTime: {type: GraphQLDateTime},
	endTime: {type: GraphQLDateTime}
}

export const EventTimeInputType = new GraphQLInputObjectType({
	name: 'EventTimeInput',
	fields: timeFields
})

export const EventTimeType = new GraphQLObjectType({
	name: 'EventTime',
	fields: timeFields
})

const locationFields = {
	info: {type: GraphQLString},
	address: {type: GraphQLString},
	coordinates: {type: new GraphQLList(GraphQLFloat)},
	reference: {type: GraphQLID}
}

export const EventLocationInputType = new GraphQLInputObjectType({
	name: 'EventLocationInput',
	fields: locationFields
})

export const EventLocationType = new GraphQLObjectType({
	name: 'EventLocation',
	fields: locationFields
})

/*export const EventInvitationType = new GraphQLObjectType({
	name: 'EventInvitationType',
	fields: {
		_id: {type: GraphQLID},
		name: {type: GraphQLString}
	}
})*/


export const EventInvitationInputType = new GraphQLInputObjectType({
	name: 'EventInvitationInputType',
	fields: {
		_id: {type: new GraphQLNonNull(GraphQLID)},
		name: {type: new GraphQLNonNull(GraphQLString)}
	}
})

const eventBaseFields = {
	_id: {type: GraphQLID},
	title: {type: new GraphQLNonNull(GraphQLString)},
	info: {type: GraphQLString}
}

export const EventBodyType = new GraphQLInputObjectType({
	name: 'EventBody',
	fields: {
		...eventBaseFields,
		time: {type: EventTimeInputType},
		location: {type: EventLocationInputType}
	}
})

/**
 * Data Transfer Object for event participation
 * */
export const EventParticipantType = new GraphQLObjectType({
	name: 'EventPaticipantType',
	fields: {
		_id: {type: GraphQLID},
		name: {type: GraphQLString},
		admin: {type: GraphQLBoolean}
	}
})


export const TodoBodyType = new GraphQLInputObjectType({
	name: 'TodoBodyType',
	fields: {
		description: {type: new GraphQLNonNull(GraphQLString)},
		takersRequired: {type: GraphQLInt},
		takers: {type: new GraphQLList(GraphQLID)},
		done: {type: GraphQLBoolean}
	}
})

export const TodoType = new GraphQLObjectType({
	name: 'TodoType',
	fields: {
		_id: {type: GraphQLID},
		creator: {type: EventParticipantType},
		description: {type: GraphQLString},
		takersRequired: {type: GraphQLInt},
		takers: {type: new GraphQLList(EventParticipantType)},
		done: {type: GraphQLBoolean}
	}
})

export const TodoActionType = new GraphQLEnumType({
	name: 'TodoActionType',
	values: {
		TAKE: {value: 'TAKE'},
		RELEASE: {value: 'RELEASE'}
	}
})

export const EventType = new GraphQLObjectType({
	name: 'Event',
	fields: {
		...eventBaseFields,
		creator: {type: EventParticipantType},
		participants: {type: new GraphQLList(EventParticipantType)},
		time: {type: EventTimeType},
		location: {type: EventLocationType},
		invites: {type: new GraphQLList(EventParticipantType)},
		todos: {type: new GraphQLList(TodoType)},
		todoCount: {type: GraphQLInt}
	}
})

export const EventInvitationType = new GraphQLObjectType({
	name: 'EventInvitation',
	fields: {
		...eventBaseFields,
		time: {type: EventTimeType},
		location: {type: EventLocationType},
		invitor: {type: EventParticipantType}
	}
})
