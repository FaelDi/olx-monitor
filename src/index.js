const config = require("./config");
const cron = require("node-cron");
const express = require("express");
const path = require("path");
const { initializeCycleTLS } = require("./components/CycleTls");
const { scraper } = require("./components/Scraper");
const { createTables } = require("./database/database.js");

let start = false;
const app = express();
const port = process.env.PORT || 8080;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public'))) // Add this line

const runScraper = async () => {
  await Promise.all(
    config.urls.map(async (url) => {
      try {
        await scraper(url);
      } catch (error) {
        console.debug("error: " + error);
      }
    })
  );
};

const main = async () => {
  console.debug("Program started")
  await createTables()
  await initializeCycleTLS()
  runScraper()
  start = true;
}

// Expose the main function via an HTTP endpoint
app.post('/start-scraper', async (req, res) => {
  await main()
  res.json({ message: "Scraper started" })
})

cron.schedule(config.interval, async () => {
  try {
    if(start){
      await runScraper()
    }
  } catch (error) {
    console.error("Error running scraper: ", error)
  }
})

app.listen(port, () => {
  console.log(`Server running`)
})

main();
