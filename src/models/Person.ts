import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { PersonAttributes } from '../types';

interface PersonCreationAttributes extends Optional<PersonAttributes, 'id'> {}

class Person extends Model<PersonAttributes, PersonCreationAttributes> implements PersonAttributes {
  public id!: number;
  public email!: string;
  public role!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Person.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'client',
      validate: {
        isIn: [['admin', 'client']],
      },
    },
  },
  {
    sequelize,
    modelName: 'Person',
    tableName: 'persons',
    timestamps: true,
  }
);

export default Person;