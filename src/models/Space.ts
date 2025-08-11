import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { SpaceAttributes } from '../types';

interface SpaceCreationAttributes extends Optional<SpaceAttributes, 'id' | 'description'> {}

class Space extends Model<SpaceAttributes, SpaceCreationAttributes> implements SpaceAttributes {
  public id!: number;
  public name!: string;
  public location!: string;
  public capacity!: number;
  public description?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Space.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Space',
    tableName: 'spaces',
    timestamps: true,
  }
);

export default Space;