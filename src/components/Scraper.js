const cheerio = require('cheerio')
const $httpClient = require('./HttpClient.js')
const scraperRepository = require('../repositories/scrapperRepository.js')
const Ad = require('./Ad.js');

let page = 1
let maxPrice = 0
let minPrice = 99999999
let sumPrices = 0
let validAds = 0
let adsFound = 0
let nextPage = true

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
            response        = await $httpClient(currentUrl)
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

        await scraperRepository.saveLog(scrapperLog)
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
        const ad = await scraperRepository.getLogsByUrl(url, 1)
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

module.exports = {
    scraper
}