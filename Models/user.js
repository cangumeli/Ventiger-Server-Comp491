import mongoose from 'mongoose'

//Tentative user schema for setup tests
const UserSchema = new mongoose.Schema({
    phone: {type: String, index: {sparse: true, unique: true}},
    email: {type: String, index: {sparse: true, unique: true}},
    name: {type: String, required: true}
})

const User = mongoose.model('User', UserSchema)

export default User

