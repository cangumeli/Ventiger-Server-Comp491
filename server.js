import express from 'express'
import './db'

const app = express()
export const PORT = 8001

//Add middle wares
app.use('/test', (req, res) => {
    res.send({message: 'Hola'})
})

//Start the http server
app.listen(PORT)
console.log(`App is listening port ${PORT}`)

//Export the app for further use
export default app