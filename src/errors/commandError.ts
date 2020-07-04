import { Permissions } from 'discord.js'
import { Command, Parameter } from '../handlers/commandHandler'

// it is what it is
export class CommandNotAllowedInDMsError extends Error {}

// errors that commands can throw with an informative message
export class CommandDefinedError extends Error {
  constructor(public message: string, ...args: any[]) {
    super(...args)
  }
}

// all errors command-related
export class CommandError extends Error {
  constructor(public command?: Command | undefined, ...args: any[]) {
    super(...args)
  }
}

export class CommandArgumentError extends CommandError {
  constructor(public parameter: Parameter, ...args: any[]) {
    super(...args)
  }
}

// if an argument cannot be coerced into the correct type
export class CommandArgumentTypeError extends CommandArgumentError {}

// if an argument is missing
export class CommandArgumentMissingError extends CommandArgumentError {}

// if a repeated argument is incomplete
export class CommandArgumentSetIncompleteError extends CommandArgumentError {}

// if an error occurs in the course of invoking the command that can't be handled safely
export class CommandInvokeError extends CommandError {
  constructor(public error: Error, ...args: any[]) {
    super(...args)
  }
}

// if the command DNE
export class CommandNotFoundError extends CommandError {
  constructor(public invokingName: string, ...args: any[]) {
    super(undefined, ...args)
  }
}

// if the user doesnt have the correct permissions
export class CommandPermissionDeniedError extends CommandError {
  constructor(
    public commandPermissions: Permissions,
    public memberPermissions: Permissions | Readonly<Permissions>,
    ...args: any[]
  ) {
    super(...args)
  }
}
