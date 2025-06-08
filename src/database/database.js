const { Pool } = require('@neondatabase/serverless'); // Use o cliente da Neon
const config = require('../config');

const pool = new Pool({
  connectionString: config.databaseUrl,
});

// Function to create tables
const createTables = async () => {
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
    'CREATE INDEX IF NOT EXISTS index_logs ON logs USING btree(id);',
    'CREATE INDEX IF NOT EXISTS index_ads ON ads USING btree(id);'
  ];

  const client = await pool.connect(); // necessário para transação com o client

  try {
    await client.query('BEGIN');

    for (const query of queries) {
      await client.query(query);
    }

    await client.query('COMMIT');
    console.debug("Tables created successfully.");
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error creating tables:", error.message);
  } finally {
    client.release(); // liberar conexão
  }
};

module.exports = {
  pool,
  createTables,
};
