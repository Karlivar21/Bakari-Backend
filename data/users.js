// data/users.js
import bcrypt from 'bcryptjs';

const users = [
    { username: '3009023670', password: bcrypt.hashSync('kalli02', 10)}, // hashed password: password1
    { username: '0601752929', password: bcrypt.hashSync('1811', 10)},
    { username: '1406993659', password: bcrypt.hashSync('Almar99', 10)},
    { username: '0604983189', password: bcrypt.hashSync('Birgir98', 10)},
    { username: '1401923339', password: bcrypt.hashSync('Bjossi92', 10)},
    { username: 'kassi1', password: bcrypt.hashSync('panta24', 10)},
    { username: 'kassi2', password: bcrypt.hashSync('panta24', 10)},
    { username: '2302942169', password: bcrypt.hashSync('Heidrun94', 10)},
    { username: '1409893129', password: bcrypt.hashSync('Sunna89', 10)}
];

export default users;
