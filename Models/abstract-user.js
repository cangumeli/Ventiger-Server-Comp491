import mongoose from 'mongoose'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

/**Password Model*/
const PasswordSchema = new mongoose.Schema({
	_id: String,
	hash: {type: String, required: true},
	salt: {type: String, required: true}
})
//https://www.sitepoint.com/user-authentication-mean-stack/
function encryptString (passwordStr, salt) {
	salt = salt || crypto.randomBytes(16).toString('hex')
	const hash = crypto.pbkdf2Sync(passwordStr, salt, 1000, 64).toString('hex')
	return {
		salt,
		hash
	}
}
PasswordSchema.statics.encrypt = encryptString

PasswordSchema.methods.isValid = function(password) {
	const { hash } = encryptString(password, this.salt)
	return this.hash === hash
}

const Password = mongoose.model('UserPassword', PasswordSchema)



/**User Model**/
const AbstractUserSchema = new mongoose.Schema({
	phone: {type: String, index: {sparse: true, unique: true}},
	email: {type: String, index: {sparse: true, unique: true}},
	name: {type: String, required: true},
	birthday: Date,
	password: {type: PasswordSchema, required: true},
	_type: String
}, {
	discriminatorKey: '_type'
})



AbstractUserSchema.methods.setPassword = function (password) {
	this.password = new Password(
		Password.encrypt(password)
	)
}

AbstractUserSchema.methods.validPassword = function(password) {
	return this.password.isValid(password)
}

/*Logic for creating a jwt*/
AbstractUserSchema.statics.TOKEN_FIELDS = {
	_id: 1,
	name: 1
}
const TIME_TO_EXP = 7
const expiry = new Date();
expiry.setDate(expiry.getDate() + TIME_TO_EXP)
const SECRET = process.env.SECRET || 'PUT_THIS_SOMEWHERE_SAFE'

AbstractUserSchema.methods.generateToken = function () {
	return jwt.sign({
		_id: this._id.toString(),
		name: this.name,
		exp: parseInt(expiry.getTime() / 1000)
	}, SECRET)
}

/**Returns the decrypted object,
 * @throws: whatever jwt.validate throws*/
AbstractUserSchema.statics.verifyToken = function (token) {
	return jwt.verify(token, SECRET)
}

const AbstractUser = mongoose.model('AbstractUser', AbstractUserSchema)

export default AbstractUser
