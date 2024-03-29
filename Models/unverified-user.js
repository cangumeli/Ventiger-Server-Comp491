import mongoose from 'mongoose'
//import crypto from 'crypto'
import User from './user'
import AbstractUser from './abstract-user'
import { ValidationCodeSchema, ValidationCode } from './_validation-code'

const TTL = (global.Test && global.Test.TTL) || 30 * 24 * 60 * 60
/**The main schema*/
const UnverifiedUserSchema = new mongoose.Schema({
	validationCode: ValidationCodeSchema,
	lastGenerated: {type: Date, index: {expires: TTL}}
})


UnverifiedUserSchema.statics.TIME_TO_LIVE = TTL

UnverifiedUserSchema.methods.generateValidationCode = function() {
	if (!this.validationCode){
		this.validationCode = new ValidationCode({})
	}
	this.lastGenerated = new Date()
	return this.validationCode.updateCode()
}

/**Requires a validation code to exist*/
UnverifiedUserSchema.methods.verify = function (code, updateFields) {
	if (this.validationCode.isValid(code)) {
		if (updateFields) {
			this._type = 'User'
			this.validationCode = undefined
			this.lastGenerated = undefined
		}
		return true
	}
	return false
}
UnverifiedUserSchema.methods.createUser = function () {
	return new User({
		name: this.name,
		phone: this.phone,
		password: this.password,
		email: this.email
	})
}

UnverifiedUserSchema.statics.conversionCommand = {
	$set: {_type: 'User'},
	$unset: {
		lastGenerated: "",
		validationCode: ""
	}
}

export default AbstractUser.discriminator('UnverifiedUser', UnverifiedUserSchema)