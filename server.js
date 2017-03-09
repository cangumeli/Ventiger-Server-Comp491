import express from 'express'
import './db'
import graphqlHTTP from 'express-graphql'
import schema from './GraphQL/schema'

const app = express()
export const PORT = 8001

if (process.argv[2]) {
	require('./GraphQL/updateSchema')
}
//Add middle wares
app.use('/api/graphql', graphqlHTTP({
	schema: schema,
	graphiql: true,
	rootValue: {codeSender: {
		send(code) {
			console.log(code)
		}}
	}
}))


//Start the http server
app.listen(PORT)
console.log(`App is listening port ${PORT}`)

//Export the app for further use
export default app