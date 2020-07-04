import * as Discord from 'discord.js'
import * as dotenv from 'dotenv'
import { onMessage } from './handlers/onMessage'
import { onReady } from './handlers/onReady'

export const client = new Discord.Client()

dotenv.config()

client.on('ready', onReady)
client.on('message', onMessage)
client.login(process.env.DISCORD_TOKEN)
