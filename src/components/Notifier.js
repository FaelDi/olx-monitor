'use strict';


const config = require('../config');
const axios = require('axios');


exports.sendNotification = async (msg) => {
    console.log("enviado: "+msg);
    const apiUrl = `https://api.telegram.org/bot${config.telegramToken}/sendMessage?chat_id=${config.telegramChatID}&text=`;
    const encodedMsg = encodeURIComponent(msg);
    return  axios.get(apiUrl + encodedMsg, { timeout: 10000 });
};

