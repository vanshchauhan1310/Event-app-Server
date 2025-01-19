import express from 'express';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import cors from 'cors';

const app = express();
const port = 3001;

// In-memory storage for OTPs
const otpStorage = new Map();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    auth: {
        user: 'vanshchauhan1310@gmail.com',
        pass: 'pzgy befk lhxp hkuu'
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.log('Transporter verification error:', error);
    } else {
        console.log('Server is ready to take messages');
    }
});

function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

app.get('/', (req, res) => {
    res.send('Password Reset Server is running!');
});

app.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
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

    res.json({ message: 'OTP verified successfully' });
});

app.post('/clear-otp', (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    otpStorage.delete(email);
    res.json({ message: 'OTP cleared successfully' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});