# knexfile.js
lines:13 exports:
---
// Knex configuration for SQLite (development)
module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './dev.db',
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations',
    },
  },
};
