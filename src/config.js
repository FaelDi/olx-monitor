require('dotenv').config()

let config = {}

config.urls = [
    'https://www.olx.com.br/artigos-infantis/brinquedos?q=toy%20story&sf=1',
    'https://www.olx.com.br/artigos-infantis/brinquedos?q=toy%20story%20signature%20collection&sf=1',
    'https://www.olx.com.br/artigos-infantis/brinquedos?q=buzz%20lightyear%20signature%20collection&sf=1',
    'https://www.olx.com.br/artigos-infantis/brinquedos?q=mineiro&sf=1',
    'https://www.olx.com.br/artigos-infantis/hobbies-e-colecoes?q=toy%20story&sf=1',
    'https://www.olx.com.br/artigos-infantis/hobbies-e-colecoes?q=toy%20story%20signature%20collection&sf=1',
    'https://www.olx.com.br/artigos-infantis/hobbies-e-colecoes?q=buzz%20lightyear%20signature%20collection&sf=1',
    'https://www.olx.com.br/artigos-infantis/hobbies-e-colecoes?q=mineiro&sf=1',
]

// this tool can help you create the interval string:
// https://tool.crontap.com/cronjob-debugger

config.interval = '*/2 * * * *' 
config.telegramChatID = process.env.TELEGRAM_CHAT_ID
config.telegramToken = process.env.TELEGRAM_TOKEN
config.databaseUser = process.env.DATABASE_USER
config.databaseHost = process.env.DATABASE_HOST
config.database = process.env.DATABASE 
config.databasePassword = process.env.DATABASE_PASSWORD
config.databasePort = process.env.DATABASE_PORT
config.logger={
    logFilePath: 'C:/Users/d_raf/OneDrive/Documentos/repositorios/olx-monitor/src/data/scrapper.log',
    timestampFormat:'YYYY-MM-DD HH:mm:ss'
}

module.exports = config