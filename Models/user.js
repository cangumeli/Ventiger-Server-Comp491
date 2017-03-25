import mongoose from 'mongoose'
import AbstractUser from './abstract-user'
import jwt from 'jsonwebtoken'

const VisibilitySchema = new mongoose.Schema({
	friends: mongoose.SchemaTypes.Mixed,
	everyone: mongoose.SchemaTypes.Mixed
})

const UserSchema = new mongoose.Schema({
	friends: [mongoose.SchemaTypes.Oid], //normalized friend storage
	friendRequests: [mongoose.SchemaTypes.Oid],
	birthday: Date,
	visibility: VisibilitySchema
})

const everyoneVis = {
	_id: 1, name: 1
}
const friendVis = {
	...everyoneVis,
	phone: 1,
	birthday: 1
}
UserSchema.statics.defaultVisibility = {
	friend: friendVis,
	everyone: everyoneVis
}

/*Logic for creating a jwt*/
UserSchema.statics.TOKEN_FIELDS = {
	_id: 1,
	name: 1
}
const TIME_TO_EXP = 7
const expiry = new Date();
expiry.setDate(expiry.getDate() + TIME_TO_EXP)
const SECRET = process.env.SECRET || 'PUT_THIS_SOMEWHERE_SAFE'

UserSchema.methods.generateToken = function () {
	return jwt.sign({
		_id: this._id.toString(),
		name: this.name,
		exp: parseInt(expiry.getTime() / 1000)
	}, SECRET)
}

UserSchema.statics.TOKEN_TIME_TO_EXP = TIME_TO_EXP

UserSchema.methods.validPassword = function(password) {
	return this.password.isValid(password)
}

/**Returns the decrypted object,
 * @throws: whatever jwt.verify throws*/
UserSchema.statics.verifyToken = function (token) {
	return jwt.verify(token, SECRET)
}

UserSchema.methods.visibilityFilter = function (accessorType) {

	const visibility = (this.visibility
		|| UserSchema.statics.defaultVisibility)[accessorType || 'everyone']
	const _user = {}
	Object.keys(this.toObject()).forEach(key => {
		//console.log('key', key)
		if (visibility[key]) {
			_user[key] = this[key]
		}
	})
	return _user
}


const Rel = {
	FRIEND: {value: 'FRIEND'},
	REQUESTED: {value: 'REQUESTED'},
	REQUESTER: {value: 'REQUESTER'},
	NOBODY: {value: 'NOBODY'},
}

UserSchema.statics.RELATIONS = Rel

UserSchema.methods.getRelation = function (other) {
	if (this.friends.some(_id => _id.equals(other._id))) {
		return Rel.FRIEND.value
	}
	if (this.friendRequests.some(_id => _id.equals(other._id))) {
		return Rel.REQUESTED.value
	}
	if (other.friendRequests.some(_id => _id.equals(this._id))) {
		return Rel.REQUESTER.value
	}
	return Rel.NOBODY.value
}

UserSchema.statics.getVisibilityByRelation = function (relationValue) {
	switch (relationValue) {
		case Rel.FRIEND.value:
			return 'friend'
		case Rel.NOBODY.value:
		case Rel.REQUESTED.value:
		case Rel.REQUESTER.value:
			return 'everyone'
	}
}

export default AbstractUser.discriminator('User', UserSchema)
