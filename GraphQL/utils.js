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
			if (todo.creator) {
				todo.creator = userTransformer.encryptUser(todo.creator)
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

export function idTransformerToEventTransformer(idTransformer) {
	const userTransformer = idTransformerToUserTransformer(idTransformer)
	const todoTransformer = idTransformerTodoTransformer(idTransformer)
	return {
		encrypt(event) {
			if (event == null) {
				return event
			}
			if (event.toObject) {
				event = event.toObject()
			} else {
				event = Object.assign({}, event)
			}
			event._id = idTransformer.encryptId(event._id)
			if (event.participants) {
				event.participants = event.participants.map(user => userTransformer.encryptUser(user))
			}
			if (event.creator) {
				event.creator = userTransformer.encryptUser(event.creator)
			}
			if (event.invites) {
				event.invites = event.invites.map(user => userTransformer.encryptUser(user))
			}
			if (event.todos) {
				event.todos = event.todos.map(todoTransformer.encrypt)
			}
			return event
		},

		decrypt(event){
			if (event == null) {
				return event
			}
			if (event._id) {
				event = Object.assign({}, event)
				event._id = idTransformer.decryptId(event._id)
			}
			if (event.participants) {
				event.participants = event.participants.map(user => userTransformer.decryptUser(user))
			}
			if (event.creator) {
				event.creator = userTransformer.decryptUser(event.creator)
			}
			if (event.invites) {
				event.invites = event.invites.map(user => userTransformer.decryptUser(user))
			}
			if (event.todos) {
				event.todos = event.todos.map(todoTransformer.decrypt)
			}
			return event
		}
	}
}
