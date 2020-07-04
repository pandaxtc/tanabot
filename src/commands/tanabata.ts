import { Permissions } from 'discord.js'
import { authorEmbed } from '../embeds/embeds'
import { Command, Context, ParameterType } from '../handlers/commandHandler'

export let tb_enabled = true

async function tanabata(context: Context, enabled: boolean) {
  tb_enabled = enabled
  status(context)
}

async function status(context: Context) {
  if (tb_enabled) {
    context.channel.send(
      authorEmbed(
        process.env.CHECK_ICON as string,
        'Tanabata posting enabled!',
        0x96c731
      )
    )
  } else {
    context.channel.send(
      authorEmbed(
        process.env.X_ICON as string,
        'Tanabata posting disabled!',
        0x96c731
      )
    )
  }
}

const statusCommand: Command = {
  names: ['status', 'info'],
  description: 'Checks if tanabata posting is enabled or disabled.',
  category: 'Fun',
  target: status,
  params: [],
}

export const command: Command = {
  names: ['tanabata', 'tb'],
  description: 'Enables/disables tanabata posting.',
  category: 'Fun',
  target: tanabata,
  subcommands: [statusCommand],
  params: [{ name: 'on/off', types: [ParameterType.Boolean] }],
  allowedInDMs: false,
  requiredPermissions: new Permissions(Permissions.FLAGS.ADMINISTRATOR),
}
