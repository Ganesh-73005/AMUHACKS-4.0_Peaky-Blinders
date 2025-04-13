const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const UserSchema = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

// Ensure JWT_SECRET is defined
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
}

// Register Function
const Register = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, email_address, phone_number, age, income, password } = req.body;

    // Validate required fields
    if (!name || !email_address || !phone_number || !age || !income || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Check if the user already exists
        const existingUser = await UserSchema.findOne({ email_address });
        if (existingUser) {
            return res.status(400).json({ error: 'Email is already registered' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Create a new user
        const user = await UserSchema.create({
            name,
            email_address,
            phone_number,
            age,
            income,
            password: hashedPassword,
        });

        // Generate JWT token
        const token = jwt.sign(
            { user_id: user._id, email: user.email_address },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Return success response
        return res.status(201).json({
            token,
            user: {
                user_id: user._id,
                name: user.name,
                email_address: user.email_address,
                phone_number: user.phone_number,
                age: user.age,
                income: user.income,
            },
        });
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ error: 'Registration failed' });
    }
};

// Login Function
const Login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email_address, password } = req.body;

    // Validate required fields
    if (!email_address || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Check if the user exists
        const user = await UserSchema.findOne({ email_address });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check if the password is valid
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { user_id: user._id, email: user.email_address },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Return success response
        return res.json({
            token,
            user: {
                user_id: user._id,
                name: user.name,
                email_address: user.email_address,
                phone_number: user.phone_number,
                age: user.age,
                income: user.income,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Login failed' });
    }
};

module.exports = {
    Register,
    Login,
};
