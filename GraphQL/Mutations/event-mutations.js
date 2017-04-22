import Event from '../../Models/event'
import User from '../../Models/user'
import {
	EventType,
	EventBodyType,
	TodoType,
	TodoBodyType,
	TodoActionType,
	PollOptionInputType,
	PollInputType,
	PollType,
	PollOptionType,
	VotingActionType,
	EventUpdateType
} from '../Types/event-types'
import {
	GraphQLNonNull,
	GraphQLString,
	GraphQLBoolean,
	GraphQLID,
	GraphQLList,
} from 'graphql'
import { IdentityTransformer } from '../../Models/identy-transformer'

const idTransformer = new IdentityTransformer()
import { getProjection, idTransformerToEventTransformer, idTransformerToUserTransformer, idTransformerTodoTransformer, idTransformerToPollTransformer } from '../utils'
const eventTransformer = idTransformerToEventTransformer(idTransformer)
const userTransformer = idTransformerToUserTransformer(idTransformer)
const todoTransformer = idTransformerTodoTransformer(idTransformer)
const pollTransformer = idTransformerToPollTransformer(idTransformer)


async function inviteUsers(event, realUserIds, me) {
	if (realUserIds.length === 0) {
		return
	}
	for (let i = 0; i < realUserIds.length; ++i) {
		event.invites.addToSet(realUserIds[i])
	}
	//console.log('IDs ', realUserIds)
	const cacheInfo = await User
		.find({_id: {$in: realUserIds}})
		.select({name: 1})
		.exec()
	//console.log('Cache info ', cacheInfo)
	if (cacheInfo.length == 0) {
		throw Error('No invites performed')
	}
	for (let i = 0; i < cacheInfo.length; ++i) {
		event.userInfo[cacheInfo[i]._id.toString()] = {...cacheInfo[i].toObject(), invitor: me._id}
		event.markModified('userInfo.' + cacheInfo[i]._id)
	}
}

export default {
	createEvent: {
		type: EventType,
		args: {
			body: {
				type: new GraphQLNonNull(EventBodyType),
				name: 'body'
			},
			token: {
				name: 'token',
				type: GraphQLString
			},
			userIds: {
				name: 'userIds',
				type: new GraphQLList(GraphQLID)
			},
		},
		async resolve(source, args, _, info) {
			const user = User.verifyToken(args.token || source.token)
			const event = new Event({
				...args.body,
				voters: user._id,
				userInfo: {
					[user._id]: {...user, admin: true}
				}
			})
			event.participants.push(user._id)
			if (args.userIds) {
				await inviteUsers(event, args.userIds.map(idTransformer.decryptId), user)
			}
			//console.log('Event ', event)
			let saved = await event.save()
			const transformed = eventTransformer.encrypt(saved.denormalize())
			return transformed
		},
	},
	updateEvent: {
		type: EventType,
		args: {
			body: {
				type: new GraphQLNonNull(EventUpdateType),
				name: 'body'
			},
			token: {
				name: 'token',
				type: GraphQLString
			},
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		async resolve(source, args) {
			const me = User.verifyToken(args.token || source.token)
			const eid = idTransformer.decryptId(args.eventId)
			const fieldsToUpdate = Object.keys(args.body)
			if (fieldsToUpdate.length == 0) {
				throw Error('NoUpdateToPerform')
			}
			const event = await Event
				.findById(eid)
				.where({participants: me._id})
				//.select(Event.selectionKeys(proj))
				.exec()
			if (!event) {
				throw Error('NoSuchEvent')
			}
			if(!event.userInfo[me._id].admin) {
				throw Error('NotAdmin')
			}
			if (fieldsToUpdate.some(f=>event.autoUpdateFields.some(af=>f===af))) {
				throw Error('PollConnectedFieldUpdateAttempt')
			}
			fieldsToUpdate.forEach(f=>{
				event[f] = args.body[f]
			})
			const saved = await event.save()
			if (source.pubsub) {
				source.pubsub.publish('updateEvent/'+eid, args.body)
			}
			return eventTransformer.encrypt(saved.denormalize())
		}
	},
	inviteToEvent: {
		type: GraphQLBoolean,
		args: {
			userIds: {
				name: 'userIds',
				type: new GraphQLNonNull(new GraphQLList(GraphQLID))
			},
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			},
			token: {
				name: 'token',
				type: GraphQLString
			},
		},
		async resolve(source, args) {
			const me = User.verifyToken(args.token || source.token)
			const event = await Event
				.findById(idTransformer.decryptId(args.eventId))
				.where({participants: me._id})
				.select({invites: 1, ...Event.meta})
				.exec()
			if (!event) {
				throw Error('NoSuchEvent')
			}
			const realUserIds = args.userIds.map(idTransformer.decryptId)
			await inviteUsers(event, realUserIds, me)
			const saved = await event.save()
			return Boolean(saved)
		}
	},
	acceptEventInvitation: {
		type: EventType,
		args: {
			token: {
				name: 'token',
				type: GraphQLString
			},
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			}
		},
		async resolve(source, args, _, info) {
			const me = User.verifyToken(args.token || source.token)
			const proj = getProjection(info.fieldNodes)
			const eid = idTransformer.decryptId(args.eventId)
			const event = await Event
				.findById(eid)
				.where({invites: me._id})
				.select(Event.selectionKeys({...proj, participants: 1, invites: 1}))
				.exec()
			if (!event) {
				throw Error('NoSuchEvent')
			}
			event.participants.addToSet(me._id)
			event.invites.pull(me._id)
			event.userInfo[me._id] = me
			event.markModified(`userInfo.${me._id}`)
			const saved = await event.save()
			return eventTransformer.encrypt(saved.denormalize())
		}
	},
	rejectEventInvitation: {
		type: GraphQLBoolean,
		args: {
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			},
			token: {
				name: 'token',
				type: GraphQLString
			},
		},
		async resolve(source, args) {
			const me = User.verifyToken(args.token || source.token)
			const eid = idTransformer.decryptId(args.eventId)
			const {n, nModified} = await Event
				.update(
					{_id: eid},
					{
						$pull: {invites: me._id},
						$unset: {[`userInfo.${me._id}`]: ""}
					})
				.exec()
			if (n == 0) {
				throw Error('NoSuchEvent')
			}
			return Boolean(nModified)
		}
	},
	leaveEvent: {
		type: GraphQLBoolean,
		args: {
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			},
			token: {
				name: 'token',
				type: GraphQLString
			},
		},
		async resolve(source, args) {
			const me = User.verifyToken(args.token || source.token)
			const eid = idTransformer.decryptId(args.eventId)
			const {n, nModified} = await Event
				.update(
					{_id: eid},
					{
						$pull: {participants: me._id},
						$unset: {[`userInfo.${me._id}`]: ""}
					})
				.exec()
			if (n == 0) {
				throw Error('NoSuchEvent')
			}
			return Boolean(nModified)
		}
	},
	addTodo: {
		type: TodoType,
		args: {
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			},
			token: {
				name: 'token',
				type: GraphQLString
			},
			body: {
				name: 'body',
				type: TodoBodyType
			}
		},
		async resolve(source, args) {
			const me = User.verifyToken(args.token || source.token)
			const eid = idTransformer.decryptId(args.eventId)
			const todoBody = todoTransformer.decrypt(args.body)
			todoBody.voters = me._id
			if (!todoBody.takers) {
				todoBody.takers = []
			}
			const event = await Event
				.findOneAndUpdate(
					{_id: eid, participants: me._id},
					{
						$push: {todos: todoBody},
						$inc: {todoCount: 1}
					},
					{
						new: true,
						select: Event.selectionKeys({todos: 1, todoCount: 1})
					}
				)
				.exec()
			if (!event) {
				throw Error("NoSuchEvent")
			}
			const todo = event.denormalize().todos[event.todos.length - 1]
			if (source.pubsub) {
				source.pubsub.publish("addTodo/" + eid, todo)
			}
			return todoTransformer.encrypt(todo)
		}
	},
	performTodoAction: {
		type: GraphQLBoolean,
		args: {
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			},
			token: {
				name: 'token',
				type: GraphQLString
			},
			todoId: {
				name: 'todoId',
				type: new GraphQLNonNull(GraphQLID)
			},
			action: {
				name: 'action',
				type: new GraphQLNonNull(TodoActionType)
			}
		},
		async resolve(source, args) {
			const me = User.verifyToken(args.token || source.token)
			const eid = idTransformer.decryptId(args.eventId)
			const tid = idTransformer.decryptId(args.todoId)
			const event = await Event
				.findOne({_id: eid, participants: me._id})
				.select({todos: 1, userInfo: 1})
				.exec()
			if (!event) {
				throw Error('No such event')
			}
			const todo = event.todos.id(tid)
			if (!todo) {
				throw Error('No such todo')
			}
			const length = todo.takers.length
			let sizeCheck = true
			switch (args.action) {
				case 'TAKE':
					todo.takers.addToSet(me._id)
					break
				case 'RELEASE':
					todo.takers.pull(me._id)
					break
				case 'DONE':
					if (todo.voters.toString() == me._id || event.userInfo[me._id].admin) {
						todo.done = true
					} else {
						throw Error('UnauthorizedUser')
					}
					sizeCheck = false
					break
				case 'UNDONE':
					todo.done = false
					sizeCheck = false
					break
				case 'REMOVE':
					if (todo.voters.toString() == me._id || event.userInfo[me._id].admin) {
						todo.remove()
					} else {
						throw Error('UnauthorizedUser')
					}
					sizeCheck = false
					break
				default:
					break //Never called
			}
			if (sizeCheck && length == todo.takers.length) {
				return false
			}
			if (source.pubsub) {
				event.denormalize()
				source.pubsub.publish("todoAction/" + eid, {todoId: tid, action: args.action})
			}
			const saved = await event.save()
			return Boolean(saved)
		},
	},
	createPoll: {
		type: PollType,
		args: {
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			},
			token: {
				name: 'token',
				type: GraphQLString
			},
			body: {
				name: 'body',
				type: new GraphQLNonNull(PollInputType)
			}
		},
		async resolve(source, args) {
			const me = User.verifyToken(args.token || source.token)
			const eid = idTransformer.decryptId(args.eventId)
			const poll = args.body
			poll.creator = me._id
			const event_ = await Event
				.findById(eid)
				.where('participants').eq(me._id)
				.select(Event.selectionKeys({polls:1}))
				.exec()
			if (!event_) {
				throw Error('NoSuchEvent')
			}
			let uconn = args.body.autoUpdateFields
			if (uconn) {
				uconn.forEach(field => {
					if (event_.autoUpdateFields.some(f=>f===field)) {
						throw Error('AlreadyConnected')
					}
				})
			} else {
				uconn = []
			}
			const saved = await Event
				.findOneAndUpdate(
					{_id: eid, participants: me._id},
					{$push: {polls: poll, autoUpdateFields: {$each: uconn}}},
					{new: true, select: Event.selectionKeys({polls: 1})}
				)
				.exec()
			const event = saved.denormalize()
			if (source.pubsub) {
				source.pubsub.publish('createPoll/' + eid, poll)
			}
			return pollTransformer.encrypt(event.polls[event.polls.length - 1])
		}
	},
	performVotingAction: {
		type: GraphQLBoolean,
		args: {
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			},
			pollId: {
				name: 'pollId',
				type: new GraphQLNonNull(GraphQLID)
			},
			optionId: {
				name: 'optionId',
				type: new GraphQLNonNull(GraphQLID)
			},
			token: {
				name: 'token',
				type: GraphQLString
			},
			action: {
				name: 'action',
				type: new GraphQLNonNull(VotingActionType)
			}
		},
		async resolve(source, args) {
			const me = User.verifyToken(args.token || source.token)
			const eid = idTransformer.decryptId(args.eventId)
			const pid = idTransformer.decryptId(args.pollId)
			const oid = idTransformer.decryptId(args.optionId)
			const event = await Event
				.findById(eid)
				.where({participants: me._id})
				.select(Event.selectionKeys({polls: 1}))
				.exec()
			if (!event) {
				throw Error('NoSuchEvent')
			}
			const eventObj = event.denormalize()
			const poll = eventObj.polls.find(p => p._id.toString() === pid)
			if (!poll) {
				throw Error('NoSuchPoll')
			}
			if (!poll.open) {
				throw Error('PollClosed')
			}
			const option = poll.options.find(o => o._id.toString() === oid)
			if (!option) {
				throw Error('NoSuchOption')
			}
			let update
			switch (args.action) {
				case 'VOTE':
					if (!poll.multi) {
						poll.options.forEach(o => {
							if (o.voters.some(x => x.toString() === me._id)) {
								throw Error('AlreadyVoted')
							}
						})
					}
					update = {$addToSet: {['pollVoters.' + pid + '.' + oid]: me._id}}
					break
				case 'UNVOTE':
					update = {$pull: {['pollVoters.' + pid + '.' + oid]: me._id}}
					break
			}
			const {nModified} = await Event
				.update(
					{_id: eid},
					update
				)
				.exec()
			// TODO: publish the autoupdate
			if (source.pubsub) {
				source.pubsub.publish('performVotingAction/' + eid, {
					pollId: pid,
					optionId: oid,
					action: args.action,
					performer: me._id
				})
			}
			return Boolean(nModified)
		}
	},
	completePoll: {
		type: GraphQLBoolean,
		args: {
			eventId: {
				name: 'eventId',
				type: new GraphQLNonNull(GraphQLID)
			},
			pollId: {
				name: 'pollId',
				type: new GraphQLNonNull(GraphQLID)
			},
			token: {
				name: 'token',
				type: GraphQLString
			}
		},
		async resolve(source, args) {
			const me = User.verifyToken(args.token || source.token)
			const eid = idTransformer.decryptId(args.eventId)
			const pid = idTransformer.decryptId(args.pollId)
			const event = await Event
				.findById(eid)
				.where({participants: me._id})
				.select(Event.selectionKeys({polls: 1}))
				.exec()
			const polli = event.polls.findIndex(p => p._id.toString() === pid)
			const poll = event.polls[polli]
			if (!poll) {
				throw Error('NoSuchPoll')
			}
			if (poll.creator.toString() !== me._id && !event.userInfo[me._id].admin) {
				throw Error('UnauthorizedComplete')
			}

			poll.open = false
			if (poll.autoUpdateFields && poll.autoUpdateFields.length > 0) {
				poll.autoUpdateFields.forEach(f => {
					event.autoUpdateFields.pull(f)
				})
				event.performAutoUpdate(poll)
			}
			const saved = await event.save()
			const res = saved.polls[polli].open === false
			if (res && source.pubsub) {
				source.pubsub.publish('completePoll/' + eid, {
					pollId: pid,
					performer: me._id
				})
			}
			return res
		}
	},

}


/*
* TODO
* Urgent
* 	auto-update logic
* 	completePoll
* Future(?)
* 	addPollOption
* 	removePoll
* */