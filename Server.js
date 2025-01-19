import express from 'express';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const app = express();
const port = 3000;

app.use(express.json());

// In-memory storage for OTPs
const otpStorage = new Map();

// Generate OTP function
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

// Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    auth: {
        user: 'vanshchauhan1310@gmail.com',
        pass: 'pzgy befk lhxp hkuu'
    }
});

// Add CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Test route
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// Send OTP route
app.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const otp = generateOTP();
        otpStorage.set(email, { otp, createdAt: Date.now() });

        const mailOptions = {
            from: 'vanshchauhan1310@gmail.com',
            to: email,
            subject: 'Your OTP for Password Reset',
            text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
            html: `<p>Your OTP is <strong>${otp}</strong>. It will expire in 10 minutes.</p>`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Detailed error:', error);
        res.status(500).json({ 
            error: 'Failed to send OTP',
            details: error.message 
        });
    }
});

// Verify OTP route
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

    otpStorage.delete(email);
    res.json({ message: 'OTP verified successfully' });
});

// Verify email configuration
transporter.verify((error, success) => {
    if (error) {
        console.log('Transporter verification error:', error);
    } else {
        console.log('Server is ready to take messages');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
