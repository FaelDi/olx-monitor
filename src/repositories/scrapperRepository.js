import { pool } from '../database/database.js' // Assuming PostgreSQL pool from pg is exported in database.js


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

export default {
    saveLog,
    getLogsByUrl
};
