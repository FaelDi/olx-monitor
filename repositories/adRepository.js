const { pool } = require('../database/database.js'); // Assuming you're using pg.Pool


const getAd = async (id) => {
    console.debug('adRepository: getAd');

    const query = `SELECT * FROM ads WHERE id = $1`;
    const values = [id];

    try {
        const res = await pool.query(query, values);

        if (res.rows.length === 0) {
            throw new Error('No ad with this ID was found');
        }

        return res.rows[0];
    } catch (error) {
        console.debug("error: "+`Error getting ad by ID: ${error.message}`);
        throw error;
    }
};

const getAdsBySearchTerm = async (term, limit) => {
    console.debug('adRepository: getAdsBySearchTerm');

    const query = `SELECT * FROM ads WHERE searchTerm = $1 LIMIT $2`;
    const values = [term, limit];

    try {
        const res = await pool.query(query, values);

        if (res.rows.length === 0) {
            throw new Error('No ad with this term was found');
        }

        return res.rows;
    } catch (error) {
        console.debug("error: "+`Error getting ads by search term: ${error.message}`);
        throw error;
    }
};

const getAdsBySearchId = async (id, limit) => {
    console.debug('adRepository: getAdsBySearchId');

    const query = `SELECT * FROM ads WHERE searchId = $1 LIMIT $2`;
    const values = [id, limit];

    try {
        const res = await pool.query(query, values);

        if (res.rows.length === 0) {
            throw new Error('No ad with this search ID was found');
        }

        return res.rows;
    } catch (error) {
        console.debug("error: "+`Error getting ads by search ID: ${error.message}`);
        throw error;
    }
};

const createAd = async (ad) => {
    console.debug('adRepository: createAd');

    const query = `
        INSERT INTO ads (id, url, title, searchTerm, price, created, lastUpdate)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    const now = new Date().toISOString();
    const values = [
        ad.id,
        ad.url,
        ad.title,
        ad.searchTerm,
        ad.price,
        now,
        now
    ];

    try {
        await pool.query(query, values);
        return true;
    } catch (error) {
        console.debug("error: "+`Error creating ad: ${error.message}`);
        throw error;
    }
};

const updateAd = async (ad) => {
    console.debug('adRepository: updateAd');

    const query = `UPDATE ads SET price = $1, lastUpdate = $2 WHERE id = $3`;
    const values = [ad.price, new Date().toISOString(), ad.id];

    try {
        await pool.query(query, values);
        return true;
    } catch (error) {
        console.debug("error: "+`Error updating ad: ${error.message}`);
        throw error;
    }
};

module.exports = {
    getAd,
    getAdsBySearchTerm,
    getAdsBySearchId,
    createAd,
    updateAd
};
