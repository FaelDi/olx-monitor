import pkg from 'pg';        // Import the entire 'pg' module as a default import.
const { Pool } = pkg;
import config from '/src/config.js' // Assuming this contains your PostgreSQL config

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

// Export the pool and createTables function
export {
  pool,
  createTables,
};