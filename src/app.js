import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import joi from 'joi'
import dayjs from 'dayjs'

const app = express()

app.use(express.json())
app.use(cors())
dotenv.config()

const mongoClient = new MongoClient(process.env.DATABASE_URL)
let db
mongoClient
  .connect()
  .then(() => {
    db = mongoClient.db()
  })
  .catch(err => console.log(err.message))

const participantRules = joi.object({
  name: joi.string().min(1).required()
})

const messageRules = joi.object({
  from: joi.string().required(),
  to: joi.string().min(1).required(),
  text: joi.string().min(1).required(),
  type: joi.string().valid('message', 'private_message').required(),
  time: joi.string()
})

app.post('/participants', async (req, res) => {
  const participant = req.body

  const validation = participantRules.validate(participant, {
    abortEarly: false
  })

  if (validation.error) {
    const errors = validation.error.details.map(detail => detail.message)
    res.status(422).send(errors)
    return
  }

  try {
    const participantExists = await db
      .collection('participants')
      .findOne({ name: participant.name })

    if (participantExists) {
      res.sendStatus(409)
      return
    }

    await db.collection('participants').insertOne({
      name: participant.name,
      lastStatus: Date.now()
    })

    await db.collection('messages').insertOne({
      from: participant.name,
      to: 'Todos',
      text: 'entra na sala...',
      type: 'status',
      time: dayjs().format('HH:mm:ss')
    })

    res.send(201)
  } catch (error) {
    res.status(500).send(error.message)
  }
})



const PORT = 5000
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))
