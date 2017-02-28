import mongoose from 'mongoose'

export const DB_URI = 'mongodb://localhost/Ventiger/:27017'

mongoose.Promise = global.Promise
export default mongoose.connect(DB_URI)