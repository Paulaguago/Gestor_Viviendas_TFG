const bcrypt = require('bcryptjs');

// Simple in-memory user storage (replace with your database)
let users = [];
let nextId = 1;

class User {
    constructor(username, email, password) {
        this.id = nextId++;
        this.username = username;
        this.email = email;
        this.password = password;
        this.createdAt = new Date();
    }

    static async create(username, email, password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User(username, email, hashedPassword);
        users.push(user);
        return user;
    }

    static findByEmail(email) {
        return users.find(user => user.email === email);
    }

    static findById(id) {
        return users.find(user => user.id === id);
    }

    static findByUsername(username) {
        return users.find(user => user.username === username);
    }

    async validatePassword(password) {
        return await bcrypt.compare(password, this.password);
    }

    static getAll() {
        return users;
    }
}

module.exports = User;