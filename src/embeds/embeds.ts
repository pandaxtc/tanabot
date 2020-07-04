import * as Discord from 'discord.js'

export function footerEmbed(
  iconUrl: string,
  text: string,
  color: number = 0x9b59b6
) {
  return new Discord.MessageEmbed({
    color: color,
    footer: {
      text: text,
      icon_url: iconUrl,
    },
  })
}

export function authorEmbed(
  iconUrl: string,
  text: string,
  color: number = 0x96c731
) {
  return new Discord.MessageEmbed({
    color: color,
    author: {
      name: text,
      icon_url: iconUrl,
    },
  })
}
