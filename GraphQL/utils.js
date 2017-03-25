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