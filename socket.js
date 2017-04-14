import { graphql } from 'graphql'

export default (server, schema, pubsub) => {
	const io = require('socket.io')(server)
	io.on('connection', (client) => {
		// TODO: client request ids
		client.on('subscription', async (data) => {
			const channelNames = {}
			const userChannelNames = {}
			// TODO: handle errors
			const res = await graphql(
				schema,
				data.query,
				{pubsub, channelNames, userChannelNames}, //Outputs
				null,
				data.variables
			)
			//Send channel names to clients
			console.log("Subscription channels ", channelNames, userChannelNames)
			client.emit('subscriptionChannels', userChannelNames)
			// Listen to channels
			Object.keys(channelNames).forEach(name => {
				pubsub.subscribe(channelNames[name])
				pubsub.on(channelNames[name], message => {
					graphql(schema, data.query, {dataPublished: {[name]: message}}, null, data.variables)
						.then(res => {
							client.emit(userChannelNames[name], res.errors ? {errors: res.errors} : res.data[name])//{[name]: res.data[name]})
						})
				})
			})
			// Send channel names to the users
		})
	})
}