import mongoose from 'mongoose'
import AbstractUser from './abstract-user'


const UserSchema = new mongoose.Schema({

})

export default AbstractUser.discriminator('User', UserSchema)

