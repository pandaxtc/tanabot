import * as Discord from 'discord.js'
import {
  CommandError,
  CommandNotFoundError,
  CommandArgumentMissingError,
  CommandArgumentTypeError,
  CommandInvokeError,
  CommandArgumentSetIncompleteError,
  CommandDefinedError,
  CommandNotAllowedInDMsError,
  CommandPermissionDeniedError,
} from '../errors/commandError'
import { footerEmbed } from '../embeds/embeds'
import { Context } from './commandHandler'

export async function handleError(
  context: Context,
  error: CommandError | CommandDefinedError
) {
  let errMessage: string = ''

  if (error instanceof CommandInvokeError) {
    console.error(error.error)

    const trace = `\`\`\`${Discord.Util.splitMessage(
      error.error.stack as string,
      {
        maxLength: 1950,
        char: '\n',
      }
    )}\`\`\``
    const out = new Discord.MessageEmbed({
      title: "Something's gone wrong!",
      description: trace,
      footer: {
        text: 'Please contact pandaxtc#7777 for support.',
        icon_url: process.env.WARNING_ICON,
      },
    })

    await context.channel.send('', out)
    return
  }

  if (error instanceof CommandDefinedError) {
    errMessage = error.message
  } else if (error instanceof CommandArgumentTypeError) {
    const types = error.parameter.types
    errMessage = `Parameter ${error.parameter.name} should be type ${[
      types.slice(0, -1).join(', '),
      types.slice(-1)[0],
    ].join(types.length < 2 ? '' : ' or ')}!`
  } else if (error instanceof CommandArgumentMissingError) {
    errMessage = `Parameter ${
      error.parameter.name
    } <${error.parameter.types.join(', ')}> is missing!`
  } else if (error instanceof CommandArgumentSetIncompleteError) {
    errMessage = `Repeated parameter ${
      error.parameter.name
    } <${error.parameter.types.join(', ')}> is missing`
  } else if (error instanceof CommandNotFoundError) {
    errMessage = `Command ${context.invokingName} not found!`
  } else if (error instanceof CommandNotAllowedInDMsError) {
    errMessage = `Command ${context.invokingName} cannot be used in DMs!`
  } else if (error instanceof CommandPermissionDeniedError) {
    errMessage = 'Permission denied.'
  }
  await context.channel.send(
    '',
    footerEmbed(process.env.WARNING_ICON as string, errMessage)
  )
}
