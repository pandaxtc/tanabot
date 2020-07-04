import * as CommandHandler from './commandHandler'

export async function onReady() {
  await CommandHandler.reloadCommands()
  // TODO: register handlers too (e.g. tanabata)
  console.log('Ready!')
}
