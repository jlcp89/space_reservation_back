import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { ReservationAttributes } from '../types';

interface ReservationCreationAttributes extends Optional<ReservationAttributes, 'id'> {}

class Reservation extends Model<ReservationAttributes, ReservationCreationAttributes> implements ReservationAttributes {
  public id!: number;
  public personId!: number;
  public spaceId!: number;
  public reservationDate!: string;
  public startTime!: string;
  public endTime!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Reservation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    personId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'persons',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    spaceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'spaces',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    reservationDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
      },
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
      validate: {
        is: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
      validate: {
        is: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        isAfterStartTime(value: string) {
          if (this.startTime && value <= this.startTime) {
            throw new Error('End time must be after start time');
          }
        },
      },
    },
  },
  {
    sequelize,
    modelName: 'Reservation',
    tableName: 'reservations',
    timestamps: true,
    indexes: [
      {
        unique: false,
        fields: ['personId'],
      },
      {
        unique: false,
        fields: ['spaceId'],
      },
      {
        unique: false,
        fields: ['reservationDate'],
      },
      {
        unique: false,
        fields: ['spaceId', 'reservationDate'],
      },
    ],
  }
);

export default Reservation;