import Discord, {
  Collection,
  DMChannel,
  MessageEmbed,
  MessageReaction,
} from 'discord.js'
import { promises } from 'fs'
import path from 'path'
import { tb_enabled } from '../commands/tanabata'
import { authorEmbed } from '../embeds/embeds'
import { CommandDefinedError } from '../errors/commandError'
import { client } from '../index'

export async function tanabataHandler(message: Discord.Message) {
  if (message.author.bot || !(message.channel instanceof DMChannel)) return
  if (!tb_enabled)
    throw new CommandDefinedError(
      'Tanabata posting is not enabled. Try again later!'
    )

  const log_channel = await client.channels.fetch(
    process.env.TANABATA_LOG_CHANNEL_ID as string
  )
  const tb_channel = await client.channels.fetch(
    process.env.TANABATA_CHANNEL_ID as string
  )

  if (
    !(
      log_channel instanceof Discord.TextChannel &&
      tb_channel instanceof Discord.TextChannel
    )
  )
    return

  await log_channel.send(
    new MessageEmbed({
      description: `**New tanabata wish from <@${message.author.id}>**\n${message.content}`,
      color: 0x96c731,
      timestamp: Date.now(),
    })
  )

  const tb_files = await promises.readdir(process.env.TANABATA_DIR as string)
  const tb_img = tb_files[Math.floor(Math.random() * tb_files.length)]
  const tb_path = path.join(process.env.TANABATA_DIR as string, tb_img)

  const confirmation = await message.channel.send(
    'This is a preview of your message! React with ✅ to send it, or ⛔ to cancel.',
    authorEmbed(
      `attachment://${tb_img}`,
      message.content,
      parseInt(tb_img, 16)
    ).attachFiles([tb_path])
  )
  await confirmation.react('✅')
  await confirmation.react('⛔')

  let reacts: Collection<String, MessageReaction>

  try {
    reacts = await confirmation.awaitReactions(
      (reaction, user) => {
        return (
          (reaction.emoji.name === '✅' || reaction.emoji.name === '⛔') &&
          !user.bot
        )
      },
      { time: 30000, max: 1, errors: ['time'] }
    )
  } catch (error) {
    throw new CommandDefinedError('Timed out! Please try again.')
  }

  if (reacts.first()?.emoji.name === '⛔') {
    throw new CommandDefinedError('Cancelled.')
  }

  await tb_channel.send(
    authorEmbed(
      `attachment://${tb_img}`,
      message.content,
      parseInt(tb_img, 16)
    ).attachFiles([tb_path])
  )
  await message.channel.send(
    "Done! If you'd like to send another wish, send another message."
  )
}
