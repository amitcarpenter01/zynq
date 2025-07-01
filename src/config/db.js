import mysql from 'mysql2';
import util from 'util';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
};

let connection;

function handleDisconnect() {
  connection = mysql.createConnection(dbConfig);

  connection.connect((err) => {
    if (err) {
      console.error("❌ Database connection error:", err);
      setTimeout(handleDisconnect, 2000); 
    } else {
      console.log('MySQL Database Connected');
    }
  });

  connection.on('error', (err) => {
    console.error("⚠️ DB error:", err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('🔁 Reconnecting to the database...');
      handleDisconnect();
    } else {
      throw err;
    }
  });
}


handleDisconnect();

function makeDb() {
  return {
    async query(sql, args) {
      // console.log("Executing query:", sql);
      if (!connection || connection.state === 'disconnected') {
        console.warn('⚠️ Connection lost. Reconnecting...');
        handleDisconnect();
        await new Promise((resolve) => setTimeout(resolve, 500)); // wait for reconnection
      }

      return util.promisify(connection.query).call(connection, sql, args);
    },
    async close() {
      console.log("🔌 Database connection closed");
      return util.promisify(connection.end).call(connection);
    }
  };
}

const db = makeDb();
export default db;


// Function to get database table structure
export async function getDatabaseStructure() {
  try {
    // Get all tables
    const tables = await db.query('SHOW TABLES');
    const structure = {};

    // For each table, get its structure
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      const columns = await db.query(`DESCRIBE ${tableName}`);
      
      structure[tableName] = columns.map(col => ({
        Field: col.Field,
        Type: col.Type,
        Null: col.Null,
        Key: col.Key,
        Default: col.Default,
        Extra: col.Extra
      }));
    }

    return structure;
  } catch (error) {
    console.error('Error getting database structure:', error);
    throw error;
  }
}

// Get database structure
// getDatabaseStructure().then(structure => {
//   console.log('Database Structure:', JSON.stringify(structure, null, 2));

//   fs.writeFileSync(
//     path.join(__dirname, 'database-structure.json'),
//     JSON.stringify(structure, null, 2),
//     'utf8'
//   );
//   console.log('✅ Database structure saved to database-structure.json');
// }).catch(error => {
//   console.error('Error getting database structure:', error);
// });


// Function to generate CREATE TABLE commands for all tables
export async function generateCreateTableCommands() {
  try {
    const structure = await getDatabaseStructure();
    const createCommands = {};

    for (const [tableName, columns] of Object.entries(structure)) {
      let createTableSQL = `CREATE TABLE ${tableName} (\n`;
      
      const columnDefinitions = columns.map(col => {
        let definition = `  ${col.Field} ${col.Type}`;
        
        // Add NULL/NOT NULL
        definition += col.Null === 'YES' ? ' NULL' : ' NOT NULL';
        
        // Add DEFAULT if exists
        if (col.Default !== null) {
          if (col.Default === 'uuid()') {
            definition += ` DEFAULT uuid()`;
          } else if (col.Default === 'CURRENT_TIMESTAMP') {
            definition += ` DEFAULT CURRENT_TIMESTAMP`;
          } else if (!isNaN(col.Default)) {
            definition += ` DEFAULT ${col.Default}`;
          } else {
            definition += ` DEFAULT '${col.Default}'`;
          }
        }

        // Add AUTO_INCREMENT if in Extra
        if (col.Extra && col.Extra.includes('auto_increment')) {
          definition += ' AUTO_INCREMENT';
        }

        // Add PRIMARY KEY constraint
        if (col.Key === 'PRI') {
          definition += ' PRIMARY KEY';
        }

        // Add UNIQUE constraint
        if (col.Key === 'UNI') {
          definition += ' UNIQUE';
        }

        return definition;
      });

      createTableSQL += columnDefinitions.join(',\n');
      createTableSQL += '\n);';
      
      createCommands[tableName] = createTableSQL;
    }

    return createCommands;
  } catch (error) {
    console.error('Error generating CREATE TABLE commands:', error);
    throw error;
  }
}

// // Example usage:
// generateCreateTableCommands().then(async (commands) => {
//   console.log('CREATE TABLE Commands:', JSON.stringify(commands, null, 2));
  
//   // Save to file if needed
//   fs.writeFileSync(
//     path.join(__dirname, 'create-table-commands.sql'),
//     Object.values(commands).join('\n\n'),
//     'utf8'
//   );
//   const dbStructure = await getDatabaseStructure();
//   // Generate foreign key constraints based on database structure
//   const foreignKeys = {};
//   for (const tableName in dbStructure) {
//     const columns = dbStructure[tableName];
    
//     columns.forEach(col => {
//       // Look for columns ending in _id that aren't primary keys
//       if (col.Field.endsWith('_id') && col.Key !== 'PRI') {
//         const referencedTable = `tbl_${col.Field.slice(0, -3)}`; // Remove _id and add tbl_ prefix
        
//         if (dbStructure[referencedTable]) {
//           if (!foreignKeys[tableName]) {
//             foreignKeys[tableName] = [];
//           }
          
//           foreignKeys[tableName].push(
//             `ALTER TABLE ${tableName} ` +
//             `ADD CONSTRAINT fk_${tableName}_${col.Field} ` + 
//             `FOREIGN KEY (${col.Field}) ` +
//             `REFERENCES ${referencedTable} (id);`
//           );
//         }
//       }
//     });
//   }

//   // Add foreign key commands to SQL file
//   const alterCommands = Object.entries(foreignKeys)
//     .map(([table, constraints]) => constraints.join('\n'))
//     .join('\n\n');

//   fs.appendFileSync(
//     path.join(__dirname, 'create-table-commands.sql'),
//     '\n\n-- Foreign Key Constraints\n' + alterCommands,
//     'utf8'
//   );
//   console.log('✅ CREATE TABLE commands saved to create-table-commands.sql');
// }).catch(error => {
//   console.error('Error generating CREATE TABLE commands:', error);
// });
