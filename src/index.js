import config from "./config"
import cron from "node-cron"
import { initializeCycleTLS } from "/src/components/CycleTls.js"
import { scraper } from "./components/Scraper.js"
import { createTables } from "./database/database.js"

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
