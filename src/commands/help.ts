import { authorEmbed } from '../embeds/embeds'
import { Command, Context } from '../handlers/commandHandler'

async function help(context: Context) {
  context.channel.send(
    authorEmbed(
      process.env.WAVE_ICON as string,
      "Hi, I'm TanaBot! DM me to hang up your wishes."
    )
  )
}

export const command: Command = {
  names: ['help'],
  description: 'Provides help!',
  category: 'Utilities',
  target: help,
  params: [],
}
