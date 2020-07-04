import { Guild, GuildMember, Permissions } from 'discord.js'
import * as Discord from 'discord.js'
import { readdirSync } from 'fs'
import minimist from 'minimist'
import {
  CommandArgumentMissingError,
  CommandArgumentSetIncompleteError,
  CommandArgumentTypeError,
  CommandDefinedError,
  CommandInvokeError,
  CommandPermissionDeniedError,
} from '../errors/commandError'

const TRUTHY = ['yes', 'true', 'on', 'enable']

const FALSY = ['no', 'false', 'off', 'disable']

enum ParameterType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Member = 'member',
  TextChannel = 'text channel',
  VoiceChannel = 'voice channel',
  Role = 'role',
  Emoji = 'emoji',
}

type Parameter = {
  name: string
  types: ParameterType[]
  isOptional?: boolean // optional arguments MUST come after all required arguments
}

type FlagParameter = Parameter & { flag: string }

type Command = {
  names: string[]
  description?: string
  category: string
  target: Function
  subcommands?: Command[]
  params: Parameter[]
  flagParams?: FlagParameter[] // optional arguments must be marked as optional function parameters
  repeatParams?: Parameter[] // repeated arguments must be placed in args
  allowedInDMs?: boolean
  requiredPermissions?: Permissions
}

class Context {
  public channel: Discord.TextBasedChannelFields
  public guild: Discord.Guild | null

  constructor(public message: Discord.Message, public invokingName: string) {
    this.channel = message.channel
    this.guild = message.guild
  }
}

function getBooleanFromString(text: string): boolean | undefined {
  text = text.trim()
  if (TRUTHY.includes(text)) return true
  if (FALSY.includes(text)) return false
}

function getMemberFromString(
  text: string,
  context: Context
): Discord.GuildMember | undefined {
  if (!text || context.guild === null) return undefined
  if (text.startsWith('<@') && text.endsWith('>')) {
    text = text.slice(2, -1)
    if (text.startsWith('!')) {
      text = text.slice(1)
    }
    return context.guild.members.cache.get(text)
  } else {
    return context.guild.members.cache.find((member) => {
      return (
        member.user.username.startsWith(text) ||
        (member.nickname?.startsWith(text) as boolean)
      )
    })
  }
}

function getTextChannelFromString(
  text: string,
  context: Context
): Discord.GuildChannel | undefined {
  if (!text || context.guild === null) return undefined
  if (text.startsWith('<#') && text.endsWith('>')) {
    text = text.slice(2, -1)
    return context.guild.channels.cache.get(text)
  } else {
    return context.guild.channels.cache.find((channel) => {
      return channel.name === text && channel instanceof Discord.TextChannel
    })
  }
}

function getRoleFromString(
  text: string,
  context: Context
): Discord.Role | undefined {
  if (!text || context.guild === null) return undefined
  if (text.startsWith('<@&') && text.endsWith('>')) {
    text = text.slice(3, -1)
    return context.guild.roles.cache.get(text)
  } else {
    return context.guild.roles.cache.find((role) => {
      return role.name.startsWith(text)
    })
  }
}

function getEmojiFromString(
  text: string,
  context: Context
): Discord.Emoji | undefined {
  if (!text || context.guild === null) return undefined
  const regex = /<:[a-zA-Z0-9]+:([0-9]+)>/g
  const match = regex.exec(text)
  if (match != null) {
    text = match[1]
  }
  return context.guild.emojis.cache.get(text)
}

const commands = new Discord.Collection<string[], Command>()

async function reloadCommands() {
  const commandModules = readdirSync('./dist/commands')
  commandModules.forEach((commandModule: string) => {
    const imported = require(`../commands/${commandModule}`)
    console.log(imported)
    if (imported.commands) {
      for (const command of imported.commands) {
        commands.set(command.names, command)
      }
    } else if (imported.command) {
      commands.set(imported.command.names, imported.command)
    } else {
      console.error(`Error loading command module ${commandModule}!`)
    }
  })
}

async function parseCommand(message: Discord.Message) {
  const content = message.content
  const prefix = process.env.PREFIX ?? '?'

  if (!content.trim().startsWith(prefix)) {
    return
  }

  const regex = /(-\w*\s"+.+?"+|-\w*\s[^"]\S*|[^"]\S*|"+.+?"+)\s*/g // argument matching regex https://regex101.com/r/PbjRv6/1
  let matches = content.match(regex)

  if (!matches) {
    return undefined
  }

  matches = matches.map((match) => {
    match = match.trim()
    if (match.charAt(0) === '"' && match.charAt(match.length - 1) === '"') {
      match = match.slice(1, match.length - 1)
    }
    return match
  })

  console.log(matches)

  const args = minimist(matches)
  console.log(args)
  const { _, ...flagArgs } = args
  let reqArgs: string[] = _
  const commandName = reqArgs[0].replace(prefix, '')
  reqArgs = reqArgs.slice(1)

  const command = commands.find((v, k) => k.includes(commandName))
  if (!command) return undefined

  const context = new Context(message, commandName)

  return { context, command, reqArgs, optArgs: flagArgs }
}

// TODO: break this up
async function invokeCommand(
  context: Context,
  command: Command,
  args: string[],
  flagArgs: { [key: string]: string }
): Promise<void> {
  if (!(context.guild instanceof Guild) && !command.allowedInDMs) return
  if (command.requiredPermissions) {
    if (!(context.message.member instanceof GuildMember)) return
    if (
      (context.message.member?.permissions.bitfield &
        command.requiredPermissions.bitfield) !==
      command.requiredPermissions.bitfield
    ) {
      throw new CommandPermissionDeniedError(
        command.requiredPermissions,
        context.message.member.permissions
      )
    }
  }

  const invokeArgs = [] // arguments to spread into target function call
  const detectedArgs: { parameter: Parameter; arg: string | undefined }[] = [] // args we've matched to a given parameter

  // detect and invoke subcommands
  if (command.subcommands) {
    const subcommandString = args[0]
    const subcommand = command.subcommands.find((sc) =>
      sc.names.includes(subcommandString)
    )
    if (subcommand) {
      args.shift()
      console.log('subcommand invoking...')
      console.log(args, flagArgs)
      return invokeCommand(context, subcommand, args, flagArgs)
    }
  }

  args.reverse()

  // map params to args, ignoring extra arguments
  command.params.forEach(function (param: Parameter) {
    if (args.length === 0) {
      if (param.isOptional) {
        detectedArgs.push({ parameter: param, arg: undefined })
      } else {
        throw new CommandArgumentMissingError(param, command, context)
      }
    }
    // console.log(index + ' ' + param.types)
    // console.log(args.length)
    detectedArgs.push({ parameter: param, arg: args.pop() })
  })

  // detect and map flag params to args
  if (command.flagParams) {
    command.flagParams.forEach(function (flagParam: FlagParameter) {
      if (flagArgs[flagParam.flag]) {
        detectedArgs.push({
          parameter: flagParam,
          arg: flagArgs[flagParam.flag].trim(),
        })
      } else {
        detectedArgs.push({ parameter: flagParam, arg: undefined })
      }
    })
  }

  // console.log(args)

  // repeat parameters
  if (command.repeatParams) {
    do {
      command.repeatParams.forEach(function (repeatParam: Parameter) {
        if (args.length === 0)
          throw new CommandArgumentSetIncompleteError(
            repeatParam,
            command,
            context
          )
        // console.log('putting in repeated argument for ' + param.name)
        detectedArgs.push({ parameter: repeatParam, arg: args.pop() })
      })
    } while (args.length > 0)
  }

  // console.log(detectedArgs)

  for (const detectedArg of detectedArgs) {
    const param: Parameter = detectedArg.parameter
    const arg: string | undefined = detectedArg.arg

    if (arg === undefined) {
      invokeArgs.push(undefined)
    } else {
      // temporary variable for types conversions
      let convertedArg:
        | boolean
        | string
        | number
        | Discord.GuildMember
        | Discord.Role
        | Discord.Channel
        | Discord.Emoji
        | undefined
      // types conversion into required types
      for (const paramType of param.types) {
        console.log(
          `converting parameter ${param.name} type ${paramType} given ${arg}`
        )
        switch (paramType) {
          case ParameterType.Member:
            convertedArg = getMemberFromString(arg, context)
            break
          case ParameterType.TextChannel:
            convertedArg = getTextChannelFromString(arg, context)
            break
          case ParameterType.Role:
            convertedArg = getRoleFromString(arg, context)
            break
          case ParameterType.Emoji:
            convertedArg = getEmojiFromString(arg, context)
            break
          case ParameterType.Number:
            convertedArg = Number(arg)
            break
          case ParameterType.Boolean:
            convertedArg = getBooleanFromString(arg)
            break
          default:
            // string
            convertedArg = arg
            break
        }
        if (typeof convertedArg === typeof true || convertedArg) {
          invokeArgs.push(convertedArg)
          break
        }
      }
      if (
        !(
          typeof convertedArg === typeof true ||
          !(typeof convertedArg === typeof 0)
        ) &&
        !convertedArg
      ) {
        if (param.isOptional) {
          invokeArgs.push(undefined)
        } else {
          throw new CommandArgumentTypeError(param, command, context)
        }
      }
    }
  }

  console.log(invokeArgs)
  return command.target(context, ...invokeArgs).catch((error: Error) => {
    if (error instanceof CommandDefinedError) {
      throw error
    } else {
      throw new CommandInvokeError(error, command)
    }
  })
}

export {
  ParameterType,
  Parameter,
  FlagParameter,
  Command,
  Context,
  commands,
  reloadCommands,
  parseCommand,
  invokeCommand,
}
