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

app.get('/participants', async (req, res) => {
  try {
    const participants = await db.collection('participants').find().toArray()
    if (!participants) {
      res.status(404).send().toArray()
      return
    }

    res.send(participants)
  } catch (error) {
    res.status(500).send(error.message)
  }
})

app.post('/messages', async (req, res) => {
  const { to, text, type } = req.body
  const { user } = req.headers

  try {
    const message = {
      from: user,
      to: to,
      text: text,
      type: type,
      time: dayjs().format('HH:mm:ss')
    }

    const validation = messageRules.validate(message, { abortEarly: false })
    if (validation.error) {
      const errors = validation.error.details.map(detail => detail.message)
      res.status(422).send(errors)
      return
    }

    const participantExists = await db
      .collection('participants')
      .findOne({ name: user })

    if (!participantExists) {
      res.sendStatus(422)
      return
    }

    await db.collection('messages').insertOne(message)

    res.send(201)
  } catch (error) {
    res.status(500).send(error.message)
  }
})

app.get('messages', async (req, res) => {
  const limit = Number(req.query.limit)
  const { user } = req.headers

  try {
    const messages = await db.collection('messages').find({}).toArray()
    const filterMessages = messages.filter(message => {
      const publicMessage = message.type === 'message'
      const messageRelatedToUser =
        message.to === 'Todos' || message.to === user || message.from === user

      return publicMessage || messageRelatedToUser
    })

    if (limit === 0 || limit < 0 || limit === !isNaN) {
      res.status(422).send(errors)
      return
    }

    res.send(filterMessages.slice(-limit))
    res.send(200)
  } catch (error) {
    res.status(500).send(error.message)
  }
})

app.post('/status', async (req, res) => {
  const { user } = req.headers

  try {
    const participantExists = await db
      .collection('participants')
      .findOne({ name: user })

    if (!participantExists) {
      res.sendStatus(404)
      return
    }

    await db
      .collection('participants')
      .updateOne({ name: user }, { $set: { lastStatus: Date.now() } })

    res.send(200)
  } catch (error) {
    res.status(500).send(error.message)
  }
})

setInterval(async () => {
  const seconds = Date.now() - 10 * 1000

  try {
    const inactiveParticipants = await db
      .collection('participants')
      .find({ lastStatus: { $lte: seconds } })
      .toArray()

    if (inactiveParticipants.length > 0) {
      const inactiveMessage = inactiveParticipants.map(inactiveParticipant => {
        return {
          from: inactiveParticipant.name,
          to: 'Todos',
          text: 'sai da sala...',
          type: 'status',
          time: dayjs().format('HH:mm:ss')
        }
      })

      await db.collection('messages').insertMany(inactiveMessage)
      await db
        .collection('participants')
        .deleteMany({ lastStatus: { $lte: seconds } })
    }
  } catch (error) {
    res.status(500).send(error.message)
  }
}, 15000)

const PORT = 5000
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))
