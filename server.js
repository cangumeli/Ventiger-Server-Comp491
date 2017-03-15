import express from 'express'
import './db'
import graphqlHTTP from 'express-graphql'
import schema from './GraphQL/schema'

const app = express()
export const PORT = 3000

if (process.argv[2]) {
	require('./GraphQL/updateSchema')
}
//Add middle wares
app.use('/api/graphql', (req, res, next) => {
	// console.log(req.headers)
	graphqlHTTP({
		schema: schema,
		graphiql: true,
		rootValue: {
			token: req.headers['authorization'],
			codeSender: {
				send(code) {
					console.log(code)
				}
			}
		}
	})(req, res, next)
})


//Start the http server
app.listen(PORT)
console.log(`App is listening port ${PORT}`)

//Export the app for further use
export default app