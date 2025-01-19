import express from 'express';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const app = express();
const port = 3000;

app.use(express.json());

// In-memory storage (replace with database in production)
const otpStorage = new Map();
const verifiedUsers = new Map();
const users = new Map(); // Simulated user database

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    auth: {
        user: 'vanshchauhan1310@gmail.com',
        pass: 'pzgy befk lhxp hkuu'
    }
});

// Verify email configuration
transporter.verify((error, success) => {
    if (error) {
        console.log('Transporter verification error:', error);
    } else {
        console.log('Server is ready to take messages');
    }
});

// Generate OTP
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

// Test route
app.get('/', (req, res) => {
    res.send('Password Reset Server is running!');
});

// Register user (for testing purposes)
app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (users.has(email)) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        users.set(email, { password: hashedPassword });

        res.json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

// Request password reset (send OTP)
app.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        if (!users.has(email)) {
            return res.status(400).json({ error: 'User not found' });
        }

        const otp = generateOTP();
        otpStorage.set(email, { 
            otp, 
            createdAt: Date.now() 
        });

        const mailOptions = {
            from: 'vanshchauhan1310@gmail.com',
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP for password reset is ${otp}. This OTP will expire in 10 minutes.`,
            html: `
                <h2>Password Reset Request</h2>
                <p>Your OTP for password reset is: <strong>${otp}</strong></p>
                <p>This OTP will expire in 10 minutes.</p>
                <p>If you didn't request this password reset, please ignore this email.</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ 
            error: 'Failed to send OTP',
            details: error.message 
        });
    }
});

// Verify OTP
app.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const storedData = otpStorage.get(email);
    
    if (!storedData) {
        return res.status(400).json({ error: 'No OTP found for this email' });
    }

    if (Date.now() - storedData.createdAt > 600000) { // 10 minutes expiry
        otpStorage.delete(email);
        return res.status(400).json({ error: 'OTP has expired' });
    }

    if (storedData.otp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
    }

    verifiedUsers.set(email, { 
        verifiedAt: Date.now(),
        expiresAt: Date.now() + 600000 // 10 minutes to reset password
    });
    otpStorage.delete(email);
    
    res.json({ message: 'OTP verified successfully' });
});

// Reset password
app.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        
        if (!email || !newPassword) {
            return res.status(400).json({ error: 'Email and new password are required' });
        }

        const verificationData = verifiedUsers.get(email);
        
        if (!verificationData) {
            return res.status(400).json({ error: 'Please verify your OTP first' });
        }

        if (Date.now() > verificationData.expiresAt) {
            verifiedUsers.delete(email);
            return res.status(400).json({ error: 'Verification expired. Please request a new OTP' });
        }

        // Hash new password and update user data
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        users.set(email, { password: hashedPassword });
        
        verifiedUsers.delete(email);
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ 
            error: 'Failed to reset password',
            details: error.message 
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
