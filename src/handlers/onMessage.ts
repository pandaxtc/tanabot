import * as Discord from 'discord.js'
import { CommandDefinedError, CommandError } from '../errors/commandError'
import * as CommandHandler from './commandHandler'
import * as ErrorHandler from './errorHandler'
import { tanabataHandler } from './tanabataHandler'

export async function onMessage(message: Discord.Message) {
  if (message.author.bot) {
    return
  }

  try {
    // TODO: figure out an intelligent way to register handlers like this
    // TODO: improve error handling for handlers
    await tanabataHandler(message)
  } catch (error) {
    if (error instanceof CommandError || error instanceof CommandDefinedError) {
      await ErrorHandler.handleError(
        {
          message: message,
          invokingName: '',
          channel: message.channel,
          guild: message.guild,
        },
        error
      )
    } else {
      throw error
    }
  }

  const parsedCommand = await CommandHandler.parseCommand(message)
  if (!parsedCommand) {
    return
  }

  const { context, command, reqArgs, optArgs } = parsedCommand
  console.log(`Invoking command ${command.names[0]}!`)
  try {
    await CommandHandler.invokeCommand(context, command, reqArgs, optArgs)
  } catch (error) {
    if (error instanceof CommandError || error instanceof CommandDefinedError) {
      await ErrorHandler.handleError(context, error)
    } else {
      throw error
    }
  }
}
