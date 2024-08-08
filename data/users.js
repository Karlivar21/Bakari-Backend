// data/users.js
const users = [
    { username: 'kalli', password: bcrypt.hashSync('password', 10)}, // hashed password: password1
    { username: 'alli', password: bcrypt.hashSync('password123', 10)},
    { username: 'almar', password: bcrypt.hashSync('password123', 10)},
    { username: 'biggi', password: bcrypt.hashSync('password123', 10)},
    { username: 'bjossi', password: bcrypt.hashSync('password123', 10)},
    { username: 'kassi1', password: bcrypt.hashSync('password123', 10)},
    { username: 'kassi2', password: bcrypt.hashSync('password123', 10)},
    { username: 'heidrun', password: bcrypt.hashSync('password123', 10)},
    { username: 'sunna', password: bcrypt.hashSync('password123', 10)}
];

export default users;
