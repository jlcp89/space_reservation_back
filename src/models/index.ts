import Person from './Person';
import Space from './Space';
import Reservation from './Reservation';

Person.hasMany(Reservation, {
  foreignKey: 'personId',
  as: 'reservations',
});

Space.hasMany(Reservation, {
  foreignKey: 'spaceId',
  as: 'reservations',
});

Reservation.belongsTo(Person, {
  foreignKey: 'personId',
  as: 'person',
});

Reservation.belongsTo(Space, {
  foreignKey: 'spaceId',
  as: 'space',
});

export { Person, Space, Reservation };