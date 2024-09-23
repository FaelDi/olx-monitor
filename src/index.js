const config = require("./config")
const cron = require("node-cron")
const express = require("express")
const { initializeCycleTLS } = require("./components/CycleTls")
const { scraper } = require("./components/Scraper")
const { createTables } = require("./database/database.js")

const app = express()
const port = 3000

const runScraper = async () => {
  for (let i = 0; i < config.urls.length; i++) {
    try {
      scraper(config.urls[i])
    } catch (error) {
      console.debug("error: " + error)
    }
  }
}

const main = async () => {
  console.debug("Program started")
  await createTables()
  await initializeCycleTLS()
  runScraper()
}

// Expose the main function via an HTTP endpoint
app.post('/start-scraper', async (req, res) => {
  await main()
  res.json({ message: "Scraper started" })
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})

cron.schedule(config.interval, () => {
  runScraper()
})