import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'app_db',
  username: process.env.DB_USER || 'app_user',
  password: process.env.DB_PASSWORD || 'app_password',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

export { sequelize };

export const testConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
};

export const syncDatabase = async (): Promise<void> => {
  try {
    const forceSync = process.env.DB_FORCE_SYNC === 'true';
    await sequelize.sync({ force: forceSync });
    console.log(`Database synchronized successfully. Force sync: ${forceSync}`);
  } catch (error) {
    console.error('Error synchronizing database:', error);
    throw error;
  }
};