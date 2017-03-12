import mongoose from 'mongoose'
import crypto from 'crypto'

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

const AbstractUser = mongoose.model('AbstractUser', AbstractUserSchema)

export default AbstractUser
