import dotenv from 'dotenv';
import cron from "node-cron"
import * as cheerio from 'cheerio'
import initCycleTLS from "cycletls"

dotenv.config();

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



const runScraper = async () => {

  for (let i = 0; i < config.urls.length; i++) {
    try {
      scraper(config.urls[i])
    } catch (error) {
      console.log("error: "+error)
    }
  }
}



let cycleTLSInstance

async function initializeCycleTLS() {
  cycleTLSInstance = await initCycleTLS()
}

async function exitCycleTLS() {
  cycleTLSInstance.exit()
}

function getCycleTLSInstance() {
  return cycleTLSInstance
}

//SCRAPPER


let page = 1
let maxPrice = 0
let minPrice = 99999999
let sumPrices = 0
let validAds = 0
let adsFound = 0
let nextPage = true

const saveLog = async (data) => {
  console.debug('scrapperRepository: saveLog');

   const query = `
       INSERT INTO logs (url, adsFound, averagePrice, minPrice, maxPrice, created)
       VALUES ($1, $2, $3, $4, $5, $6)
   `;

   const now = new Date().toISOString();

   const values = [
       data.url,
       data.adsFound,
       data.averagePrice,
       data.minPrice,
       data.maxPrice,
       now,
   ];

   try {
       // Execute the query with PostgreSQL
       const res = await pool.query(query, values);
       return res.rows;
   } catch (error) {
       console.log("error: "+`Error saving log: ${error.message}`);
       throw error;
   }
};

const getLogsByUrl = async (url, limit) => {

   const query = `
       SELECT * FROM logs WHERE url = $1 LIMIT $2
   `;

   const values = [url, limit];

   try {
       // Execute the query with PostgreSQL
       const res = await pool.query(query, values);

       if (!res.rows.length) {
           throw new Error('No logs found for this URL');
       }

       return res.rows;
   } catch (error) {
       console.log("error: "+`Error retrieving logs: ${error.message}`);
       throw error;
   }
};


const scraper = async (url) => {
    page = 1
    maxPrice = 0
    minPrice = 99999999
    sumPrices = 0
    adsFound = 0
    validAds = 0
    nextPage = true

    const parsedUrl = new URL(url)
    const searchTerm = parsedUrl.searchParams.get('q') || ''
    const notify = await urlAlreadySearched(url)
    console.log(`Will notify: ${notify}`)

    do {
        const currentUrl = setUrlParam(url, 'o', page)
        let response
        try {
            response        = await httpClient(currentUrl)
            const $         = cheerio.load(response)
            nextPage        = await scrapePage($, searchTerm, notify, url)
        } catch (error) {
            console.log("error: "+error)
            return
        }
        page++

    } while (nextPage);

    console.log('Valid ads: ' + validAds)

    if (validAds) {
        const averagePrice = sumPrices / validAds;

        console.log('Maximum price: ' + maxPrice)
        console.log('Minimum price: ' + minPrice)
        console.log('Average price: ' + sumPrices / validAds)

        const scrapperLog = {
            url,
            adsFound: validAds,
            averagePrice,
            minPrice,
            maxPrice,
        }

        await saveLog(scrapperLog)
    }
}

const scrapePage = async ($, searchTerm, notify) => {
    try {
        const script = $('script[id="__NEXT_DATA__"]').text()

        if (!script) {
            return false
        }

        const adList = JSON.parse(script).props.pageProps.ads

        if (!Array.isArray(adList) || !adList.length ) {
            return false
        }

        adsFound += adList.length

        console.log(`Checking new ads for: ${searchTerm}`)
        console.log('Ads found: ' + adsFound)

        for (let i = 0; i < adList.length; i++) {

           console.debug('Checking ad: ' + (i + 1))

            const advert = adList[i]
            const title = advert.subject
            const id = advert.listId
            const url = advert.url
            const price = parseInt(advert.price?.replace('R$ ', '')?.replace('.', '') || '0')

            const result = {
                id,
                url,
                title,
                searchTerm,
                price,
                notify
            }

            const ad = new Ad(result)
            ad.process()

            if (ad.valid) {
                validAds++
                minPrice = checkMinPrice(ad.price, minPrice)
                maxPrice = checkMaxPrice(ad.price, maxPrice)
                sumPrices += ad.price
            }
        }

        return true
    } catch (error) {
        console.log("error: "+error);
        throw new Error('Scraping failed');
    }
}

const urlAlreadySearched = async (url) => {
    try {
        const ad = await getLogsByUrl(url, 1)
        if (ad.length) {
            return true
        }
        console.log('First run, no notifications')
        return false
    } catch (error) {
        console.log("error: "+error)
        return false
    }
}

const setUrlParam = (url, param, value) => {
    
    const newUrl = new URL(url)
    let searchParams = newUrl.searchParams;
    searchParams.set(param, value);
    newUrl.search = searchParams.toString();

    return newUrl.toString();
}

const checkMinPrice = (price, minPrice) => {
    if (price < minPrice) return price
    else return minPrice
}

const checkMaxPrice = (price, maxPrice) => {
    if (price > maxPrice) return price
    else return maxPrice
}

export {
    scraper
}

//notifier 
import axios from 'axios';

const sendNotification =  (msg) => {
    console.log("enviado: "+msg);
    const apiUrl = `https://api.telegram.org/bot${config.telegramToken}/sendMessage?chat_id=${config.telegramChatID}&text=`;
    const encodedMsg = encodeURIComponent(msg);
    return  axios.get(apiUrl + encodedMsg, { timeout: 10000 });
};

//httpclient

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
}

const requestsFingerprints = [
  [
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:87.0) Gecko/20100101 Firefox/87.0",
    "771,4865-4867-4866-49195-49199-52393-52392-49196-49200-49162-49161-49171-49172-51-57-47-53-10,0-23-65281-10-11-35-16-5-51-43-13-45-28-21,29-23-24-25-256-257,0",
  ],
  [
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:87.0) Gecko/20100101 Firefox/87.0",
    "771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,27-51-35-13-18-23-16-0-5-65281-11-43-10-45-17513-21,29-23-24,0",
  ],
]

const httpClient = async (url) => {
  const cycleTLS = await getCycleTLSInstance()

  const randomRequestFingerprint =
    requestsFingerprints[
      Math.floor(Math.random() * requestsFingerprints.length)
    ]

  try {
    // Send request
    const response = await cycleTLS(
      url,
      {
        userAgent: randomRequestFingerprint[0],
        ja3: randomRequestFingerprint[1],
        headers,
      },
      "get"
    )

    return response.body
  } catch (error) {
    console.log("error: "+error)
  }
}

//ads
class Ad {

  constructor(ad) {
      this.id         = ad.id
      this.url        = ad.url
      this.title      = ad.title
      this.searchTerm = ad.searchTerm
      this.price      = ad.price
      this.valid      = false
      this.saved      = null,
      this.notify     = ad.notify
  }

  process = async () => {

      if (!this.isValidAd()) {
         console.debug('Ad not valid');
          return false
      }

      try {

          // check if this entry was already added to DB
          if (await this.alreadySaved()) {
              return this.checkPriceChange()
          }

          else {
              // create a new entry in the database
              console.log("url: "+this.url+"\ntitulo: "+this.title+"\n");
              return this.addToDataBase()
          }

      } catch (error) {
          console.log("error: "+error);
      }
  }

  alreadySaved = async () => {
      try {
          this.saved = await adRepository.getAd(this.id)
          return true
      } catch (error) {
          return false
      }
  }

  addToDataBase = async () => {

      try {
          await adRepository.createAd(this)
          console.log('Ad ' + this.id + ' added to the database')
      }

      catch (error) {
          console.log("error: "+error)
      }

      if (this.notify) {
          const msg = 'Novo Anuncio encontrado!\n' + this.title + ' - R$' + this.price + '\n\n' + this.url;
          let retries = 20;
          const delay = ms => new Promise(resolve => setTimeout(resolve, ms));  // Delay function
      
          while (retries > 0) {
              try {
                  await notifier.sendNotification(msg, this.id);
                  console.log('Notification sent successfully');
                  break;  // Exit loop if successful
              } catch (error) {
                  retries--;
                  console.log(`************${msg}************`);
                  console.log(`error: Could not send a notification. Retries left: ${retries}`);
      
                  if (retries > 0) {
                      await delay(30000);  // Wait for 2 seconds before retrying
                  } else {
                      console.log('Failed to send notification after multiple attempts.');
                  }
              }
          }
      }
  }

  updatePrice = async () => {
      console.log('updatePrice')

      try {
          await adRepository.updateAd(this)
      } catch (error) {
          console.log("error: "+error)
      }
  }

  checkPriceChange = async () => {

      if (this.price !== this.saved.price) {

          await this.updatePrice(this)

          // just send a notification if the price dropped
          if (this.price < this.saved.price) {

              console.log('This ad had a price reduction: ' + this.url)

              const decreasePercentage = Math.abs(Math.round(((this.price - this.saved.price) / this.saved.price) * 100))

              const msg = 'Queda de preço encontrada! ' + decreasePercentage + '% OFF!\n' +
                  'From R$' + this.saved.price + ' to R$' + this.price + '\n\n' + this.url

              try {
                  await notifier.sendNotification(msg, this.id)
              } catch (error) {
                  console.log("error: "+error)
              }
          }
      }
  }

  // some elements found in the ads selection don't have an url
  // I supposed that OLX adds other content between the ads,
  // let's clean those empty ads
  isValidAd = () => {


      if (!isNaN(this.price) && this.url && this.id && this.title) {
          if(this.title.toLowerCase().includes(this.searchTerm.toLowerCase())){
              this.valid = true
              return true
          }
      }
      
      
      this.valid = false
      return false
  }
}
//database
import pkg from 'pg';        // Import the entire 'pg' module as a default import.
const { Pool } = pkg;

// Initialize PostgreSQL connection
const pool = new Pool({
  user: config.databaseUser,
  host: config.databaseHost,
  database: config.database,
  password: config.databasePassword,
  port: config.databasePort,
});

// Function to create tables
const createTables = async () => {
  // Define separate SQL statements for each table creation
  const queries = [
    `
    CREATE TABLE IF NOT EXISTS ads (
        id SERIAL PRIMARY KEY,
        searchTerm TEXT NOT NULL,
        title TEXT NOT NULL,
        price INTEGER NOT NULL,
        url TEXT NOT NULL,
        created TIMESTAMP NOT NULL,
        lastUpdate TIMESTAMP NOT NULL
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,  
        adsFound INTEGER NOT NULL, 
        averagePrice NUMERIC NOT NULL,
        minPrice NUMERIC NOT NULL,
        maxPrice NUMERIC NOT NULL, 
        created TIMESTAMP NOT NULL
    );
    `,
    'CREATE INDEX index_logs ON logs USING btree(id);',
    'CREATE INDEX index_ads ON ads USING btree(id);'
  ];

  try {
    // Use a transaction to execute multiple queries
    await pool.query('BEGIN');

    // Iterate through the array of queries and execute them one by one
    for (const query of queries) {
      await pool.query(query);
    }

    // Commit the transaction
    await pool.query('COMMIT');
    console.log("Tables created successfully.");
  } catch (error) {
    // Rollback the transaction if an error occurs
    await pool.query('ROLLBACK');
    console.error("Error creating tables:", error.message);
  }
};


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