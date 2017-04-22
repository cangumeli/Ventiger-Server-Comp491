export function getProjection(fieldNodes) {
	return fieldNodes[0].selectionSet.selections.reduce((projections, selection) => {
		//console.log(selection.selectionSet
		//      && selection.selectionSet.selections);
		//console.log('------');
		projections[selection.name.value] = 1
		return projections
	}, {})
}

export function idTransformerToUserTransformer(idTransformer) {
	return {
		encryptUser(user) {
			if (user == null) {
				return user
			}
			if (user.toObject) {
				user = user.toObject()
			} else {
				user = Object.assign({}, user)
			}
			user._id = idTransformer.encryptId(user._id)
			return user
		},

		decryptUser(user){
			if (user == null) {
				return user
			}
			if (user._id) {
				user = Object.assign({}, user)
				user._id = idTransformer.decryptId(user._id)
			}
			return user
		}
	}
}

export function idTransformerTodoTransformer(idTransformer) {
	const userTransformer = idTransformerToUserTransformer(idTransformer)
	return {
		encrypt(todo) {
			if (todo.toObject) {
				todo = todo.toObject()
			} else {
				todo = Object.assign({}, todo)
			}
			if (todo.takers) {
				todo.takers = todo.takers.map(userTransformer.encryptUser)
			}
			if (todo.voters) {
				todo.voters = userTransformer.encryptUser(todo.voters)
			}
			if (todo._id) {
				todo._id = idTransformer.encryptId(todo._id)
			}
			return todo
		},
		decrypt(todo) {
			if (todo.toObject) {
				todo = todo.toObject()
			} else {
				todo = Object.assign({}, todo)
			}
			if (todo.takers) {
				todo.takers = todo.takers.map(userTransformer.decryptUser)
			}
			if (todo._id) {
				todo._id = idTransformer.decryptId(todo._id)
			}
			return todo
		}
	}
}

export function idTransformerToPollOptionTransformer(idTransformer) {
	const userTransformer = idTransformerToUserTransformer(idTransformer)
	function perform(pollOption, crypt){
		if (pollOption.toObject) {
			pollOption = pollOption.toObject()
		} else {
			pollOption = Object.assign({}, pollOption)
		}
		if (pollOption.voters) {
			pollOption.voters = pollOption.voters.map(userTransformer[crypt+"User"])
		}
		if (pollOption._id) {
			pollOption._id = idTransformer[crypt+"Id"](pollOption._id)
		}
		return pollOption
	}
	return {
		encrypt(pollOption) {
			return perform(pollOption, 'encrypt')
		},
		decrypt(pollOption) {
			return perform(pollOption, 'decrypt')
		}
	}
}

export function idTransformerToPollTransformer(idTransformer) {
	const userTransformer = idTransformerToUserTransformer(idTransformer)
	const pollOptionTransformer = idTransformerToPollOptionTransformer(idTransformer)
	function perform(poll, crypt){
		if (poll.toObject) {
			poll = poll.toObject()
		} else {
			poll = Object.assign({}, poll)
		}
		//console.log('right there ', poll)
		if(poll.options){
			poll.options = poll.options.map(pollOptionTransformer[crypt])
		}
		if (poll.creator) {
			poll.creator = userTransformer[crypt+"User"](poll.creator)
		}
		if (poll._id) {
			poll._id = idTransformer[crypt+"Id"](poll._id)
		}
		return poll
	}
	return {
		encrypt(poll) {
			return perform(poll, 'encrypt')
		},
		decrypt(poll) {
			return perform(poll, 'decrypt')
		}
	}
}

export function idTransformerToEventTransformer(idTransformer) {
	const userTransformer = idTransformerToUserTransformer(idTransformer)
	const todoTransformer = idTransformerTodoTransformer(idTransformer)
	const pollTransformer = idTransformerToPollTransformer(idTransformer)
	function perform(event, crypt) {
			if (event == null) {
				return event
			}
			if (event.toObject) {
				event = event.toObject()
			} else {
				event = Object.assign({}, event)
			}
			event._id = idTransformer[crypt+"Id"](event._id)
			if (event.participants) {
				event.participants = event.participants.map(userTransformer[crypt+"User"])
			}
			if (event.creator) {
				event.creator = userTransformer[crypt+"User"](event.creator)
			}
			if (event.invites) {
				event.invites = event.invites.map(user => userTransformer[crypt+"User"](user))
			}
			if (event.todos) {
				event.todos = event.todos.map(todoTransformer[crypt])
			}
			if (event.polls) {
				event.polls = event.polls.map(pollTransformer[crypt])
			}
			return event
		}

	return {
		encrypt(poll) {
			return perform(poll, 'encrypt')
		},
		decrypt(poll) {
			return perform(poll, 'decrypt')
		}
	}
}
