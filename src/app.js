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



const PORT = 5000
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))
