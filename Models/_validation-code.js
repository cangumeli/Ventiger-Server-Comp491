import mongoose from 'mongoose'
import crypto from 'crypto'

const CODE_SIZE = 5
export const ValidationCodeSchema = new mongoose.Schema({
	_hash: {type: String, required: true},
	_salt: {type: String, required: true}
})

function encryptString (passwordStr, salt) {
	salt = salt || crypto.randomBytes(16).toString('hex')
	const hash = crypto.pbkdf2Sync(passwordStr, salt, 1000, 64).toString('hex')
	return {
		salt,
		hash
	}
}

ValidationCodeSchema.methods.updateCode = function () {
	const validationCode = crypto.randomBytes(CODE_SIZE).toString('hex')
	const { hash, salt } = encryptString(validationCode)
	this._salt = salt
	this._hash = hash
	return validationCode
}


ValidationCodeSchema.methods.isValid = function(code) {
	const { hash } = encryptString(code, this._salt)
	return this._hash === hash
}

export const ValidationCode = mongoose.model('RegisterValidationCode', ValidationCodeSchema)
