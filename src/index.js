const config = require("/src/config/config.js")
const cron = require("node-cron")
const { initializeCycleTLS } = require("/src/components/CycleTls.js")
const { scraper } = require("./components/Scraper.js")
const { createTables } = require("./database/database.js")

const runScraper = async () => {

  for (let i = 0; i < config.urls.length; i++) {
    try {
      scraper(config.urls[i])
    } catch (error) {
      console.log("error: "+error)
    }
  }
}

const main = async () => {
  console.log("Program started")
  await createTables()
  await initializeCycleTLS()
  runScraper()
}

main()

cron.schedule(config.interval, () => {
  runScraper()
})
