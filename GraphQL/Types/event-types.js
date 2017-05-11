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

import Event from '../../Models/event'

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
	name: 'EventInvitationInput',
	fields: {
		_id: {type: new GraphQLNonNull(GraphQLID)},
		name: {type: new GraphQLNonNull(GraphQLString)}
	}
})

export const EventKind = new GraphQLEnumType({
	name: 'EventKind',
	values: {
		PRIVATE: {value: 'PRIVATE'},
		FRIENDS: {value: 'FRIENDS'},
		EVERYONE: {value: 'EVERYONE'},
	}
})

const eventBaseFields = {
	title: {type: new GraphQLNonNull(GraphQLString)},
	info: {type: GraphQLString}
}

export const EventBodyType = new GraphQLInputObjectType({
	name: 'EventBody',
	fields: {
		...eventBaseFields,
		time: {type: EventTimeInputType},
		location: {type: EventLocationInputType},
		visibility: {type: EventKind}
	}
})

export const EventUpdateType = new GraphQLInputObjectType({
	name: 'EventUpdate',
	fields: {
		title: {type: GraphQLString},
		time: {type: EventTimeInputType},
		location: {type: EventLocationInputType},
		info: {type: GraphQLString}
	}
})

export const EventUpdateOutputType = new GraphQLObjectType({
	name: 'EventUpdateOutput',
	fields: {
		_id: {type: GraphQLID},
		title: {type: GraphQLString},
		time: {type: EventTimeType},
		location: {type: EventLocationType},
		info: {type: GraphQLString}
	}
})
/**
 * Data Transfer Object for event participations
 * */
export const EventParticipantType = new GraphQLObjectType({
	name: 'EventPaticipant',
	fields: {
		_id: {type: GraphQLID},
		name: {type: GraphQLString},
		admin: {type: GraphQLBoolean}
	}
})


export const TodoBodyType = new GraphQLInputObjectType({
	name: 'TodoBody',
	fields: {
		description: {type: new GraphQLNonNull(GraphQLString)},
		takersRequired: {type: GraphQLInt},
		takers: {type: new GraphQLList(GraphQLID)},
		done: {type: GraphQLBoolean}
	}
})

export const TodoType = new GraphQLObjectType({
	name: 'Todo',
	fields: {
		_id: {type: GraphQLID},
		creator: {type: EventParticipantType},
		description: {type: GraphQLString},
		takersRequired: {type: GraphQLInt},
		takers: {type: new GraphQLList(EventParticipantType)},
		done: {type: GraphQLBoolean},
		createdAt: {type: GraphQLDateTime}
	}
})

export const TodoActionType = new GraphQLEnumType({
	name: 'TodoAction',
	values: {
		TAKE: {value: 'TAKE'},
		RELEASE: {value: 'RELEASE'},
		DONE: {value: 'DONE'},
		UNDONE: {value: 'UNDONE'},
		REMOVE: {value: 'REMOVE'}
	}
})

export const TodoActionSubType = new GraphQLObjectType({
	name: 'TodoActionSub',
	fields: {
		todoId: {type: GraphQLID},
		action: {type: TodoActionType},
		performerId: {type: GraphQLID}
	}
})

export const PollOptionType = new GraphQLObjectType({
	name: 'PollOption',
	fields: {
		_id: {type: GraphQLID},
		description: {type: GraphQLString},
		voters: {type: new GraphQLList(EventParticipantType)},
		time: {type: EventTimeType},
		location: {type: EventLocationType}
	}
})

export const PollAutoUpdateConnectionEnum = new GraphQLEnumType({
	name: 'PollAutoUpdateConnection',
	values: {
		location: {value: 'location'},
		time: {value: 'time'}
	}
})

const autoUpdateTypeValues = {}
Event.POLL_AUTOUPDATE_TYPES.forEach(type=>{
	autoUpdateTypeValues[type] = {[type]: {value: type}}
})
export const PollAutoUpdateType = new GraphQLEnumType({
	name: 'PollAutoUpdateType',
	values: autoUpdateTypeValues
})

export const PollType = new GraphQLObjectType({
	name: 'Poll',
	fields: {
		_id: {type: GraphQLID},
		creator: {type: EventParticipantType},
		options: {type: new GraphQLList(PollOptionType)},
		multi: {type: GraphQLBoolean},
		open: {type: GraphQLBoolean},
		autoUpdateFields: {type: new GraphQLList(GraphQLString)},
		autoUpdateType: {type: PollAutoUpdateType},
		createdAt: {type: GraphQLDateTime},
		title: {type: GraphQLString}
	}
})

export const PollOptionInputType = new GraphQLInputObjectType({
	name: 'PollOptionBody',
	fields: {
		time: {type: EventTimeInputType},
		location: {type: EventLocationInputType},
		description: {type: GraphQLString},
	}
})

export const PollInputType = new GraphQLInputObjectType({
	name: 'PollBody',
	fields: {
		title: {type: new GraphQLNonNull(GraphQLString)},
		options: {type: new GraphQLList(PollOptionInputType)},
		multi: {type: GraphQLBoolean},
		autoUpdateFields: {type: new GraphQLList(PollAutoUpdateConnectionEnum)},
		autoUpdateType: {type: PollAutoUpdateType}
	}
})


export const PollCompleteSubType = new GraphQLObjectType({
	name: 'PollCompleteSubType',
	fields: {
		pollId: {type: GraphQLID},
		update: {type: PollOptionType}
	}
})

export const VotingActionType = new GraphQLEnumType({
	name: 'VotingAction',
	values: {
		VOTE: {value: 'VOTE'},
		UNVOTE: {value: 'UNVOTE'}
	}
})

export const VotingActionSubType = new GraphQLObjectType({
	name: 'VotingActionSub',
	fields: {
		pollId: {type: GraphQLID},
		optionId: {type: GraphQLID},
		action: {type: VotingActionType},
		performer: {type: EventParticipantType},
		autoUpdate: {type: PollOptionType},
		fieldsToUnset: {type: new GraphQLList(PollAutoUpdateConnectionEnum)}
	}
})

export const EventType = new GraphQLObjectType({
	name: 'Event',
	fields: {
		...eventBaseFields,
		_id: {type: GraphQLID},
		creator: {type: EventParticipantType},
		participants: {type: new GraphQLList(EventParticipantType)},
		time: {type: EventTimeType},
		location: {type: EventLocationType},
		invites: {type: new GraphQLList(EventParticipantType)},
		todos: {type: new GraphQLList(TodoType)},
		todoCount: {type: GraphQLInt},
		polls: {type: new GraphQLList(PollType)},
		autoUpdateFields: {type: new GraphQLList(GraphQLString)},
		createdAt: {type: GraphQLDateTime},
		//visibility:{type: EventKind}
	}
})

export const EventInvitationType = new GraphQLObjectType({
	name: 'EventInvitation',
	fields: {
		_id: {type: GraphQLID},
		...eventBaseFields,
		time: {type: EventTimeType},
		location: {type: EventLocationType},
		invitor: {type: EventParticipantType}
	}
})