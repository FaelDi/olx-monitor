const config = require("./config");
const cron = require("node-cron");

if (typeof WebSocket === "undefined") {
  global.WebSocket = require("ws");
}
const path = require("path");
const { initializeCycleTLS } = require("./components/CycleTls");
const { scraper } = require("./components/Scraper");
const { createTables } = require("./database/database.js");

let start = false;


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



cron.schedule(config.interval, async () => {
  try {
    if(start){
      await runScraper()
    }
  } catch (error) {
    console.error("Error running scraper: ", error)
  }
})


main();
