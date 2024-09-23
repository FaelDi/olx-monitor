const cheerio = require('cheerio')
const $httpClient = require('./HttpClient.js')
const scraperRepository = require('../repositories/scrapperRepository.js')
const Ad = require('./Ad.js');

const INITIAL_MIN_PRICE = 99999999;
const INITIAL_MAX_PRICE = 0;

let page, maxPrice, minPrice, sumPrices, validAds, adsFound, nextPage;

const resetVariables = () => {
    page = 1;
    maxPrice = INITIAL_MAX_PRICE;
    minPrice = INITIAL_MIN_PRICE;
    sumPrices = 0;
    adsFound = 0;
    validAds = 0;
    nextPage = true;
};

const scraper = async (url) => {
    resetVariables();

    const parsedUrl = new URL(url);
    const searchTerm = parsedUrl.searchParams.get('q') || '';
    const notify = await urlAlreadySearched(url);
    console.debug(`Will notify: ${notify}`);

    do {
        const currentUrl = setUrlParam(url, 'o', page);
        try {
            const response = await $httpClient(currentUrl);
            const $ = cheerio.load(response);
            nextPage = await scrapePage($, searchTerm, notify);
        } catch (error) {
            console.error("Error fetching page:", error);
            return;
        }
        page++;
    } while (nextPage);

    console.debug('Valid ads:', validAds);

    if (validAds) {
        const averagePrice = sumPrices / validAds;
        console.debug('Maximum price:', maxPrice);
        console.debug('Minimum price:', minPrice);
        console.debug('Average price:', averagePrice);

        const scrapperLog = {
            url,
            adsFound: validAds,
            averagePrice,
            minPrice,
            maxPrice,
        };

        await scraperRepository.saveLog(scrapperLog);
    }
};

const scrapePage = async ($, searchTerm, notify) => {
    try {
        const script = $('script[id="__NEXT_DATA__"]').text();
        if (!script) return false;

        const adList = JSON.parse(script).props.pageProps.ads;
        if (!Array.isArray(adList) || !adList.length) return false;

        adsFound += adList.length;
        console.debug(`Checking new ads for: ${searchTerm}`);
        console.debug('Ads found:', adsFound);

        for (let i = 0; i < adList.length; i++) {
            console.debug('Checking ad:', i + 1);

            const advert = adList[i];
            const price = parseInt(advert.price?.replace('R$ ', '')?.replace('.', '') || '0');

            const ad = new Ad({
                id: advert.listId,
                url: advert.url,
                title: advert.subject,
                searchTerm,
                price,
                notify
            });
            ad.process();

            if (ad.valid) {
                validAds++;
                minPrice = Math.min(ad.price, minPrice);
                maxPrice = Math.max(ad.price, maxPrice);
                sumPrices += ad.price;
            }
        }

        return true;
    } catch (error) {
        console.error("Error scraping page:", error);
        throw new Error('Scraping failed');
    }
};

const urlAlreadySearched = async (url) => {
    try {
        const ad = await scraperRepository.getLogsByUrl(url, 1);
        if (ad.length) return true;
        console.debug('First run, no notifications');
        return false;
    } catch (error) {
        console.error("Error checking URL:", error);
        return false;
    }
};

const setUrlParam = (url, param, value) => {
    const newUrl = new URL(url);
    newUrl.searchParams.set(param, value);
    return newUrl.toString();
};

module.exports = {
    scraper
};