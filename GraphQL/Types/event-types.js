import {
	GraphQLID,
	GraphQLString,
	GraphQLFloat,
	GraphQLList,
	GraphQLInputObjectType,
	GraphQLNonNull,
	GraphQLObjectType,
	GraphQLBoolean
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

const eventBaseFields = {
	title: {type: new GraphQLNonNull(GraphQLString)},
	info: {type: GraphQLString},
	invites: {type: new GraphQLList(GraphQLID)},
}

export const EventBodyType = new GraphQLInputObjectType({
	name: 'EventBody',
	fields: {
		...eventBaseFields,
		time: {type: EventTimeInputType},
		eventLocation: {type: EventLocationInputType}
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

export const EventType = new GraphQLObjectType({
	name: 'Event',
	fields: {
		...eventBaseFields,
		creator: {type: EventParticipantType},
		participants: {type: new GraphQLList(EventParticipantType)},
		time: {type: EventTimeType},
		eventLocation: {type: EventLocationType}
	}
})



