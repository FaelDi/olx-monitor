'use strict';

const notifier = require('./Notifier')
const $logger = require('./Logger')

const adRepository = require('../repositories/adRepository.js')

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
            $logger.debug('Ad not valid');
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

module.exports = Ad
