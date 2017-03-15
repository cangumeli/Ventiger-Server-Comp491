import mongoose from 'mongoose'
import AbstractUser from './abstract-user'
import jwt from 'jsonwebtoken'

const UserSchema = new mongoose.Schema({
	friends: {
		_ids: [mongoose.SchemaTypes.Oid],
		payloads: mongoose.SchemaTypes.Mixed // key value pairs
	}
})
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

export default AbstractUser.discriminator('User', UserSchema)
