import express from 'express';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const app = express();
const port = 3000;

app.use(express.json());

// In-memory storage for OTPs (replace with a database in production)
const otpStorage = new Map();

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: 'vanshchauhan1310@gmail.com',
    pass: 'pzgy befk lhxp hkuu'
  }
});

// Generate OTP
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

app.get('/' ,(req,res) => {
res.send("Hello World");
})


// Send OTP
app.post('/send-otp', async (req, res) => {
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
    text: `Your OTP is ${otp}. It will expire in 10 minutes.`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP
app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  const storedOTP = otpStorage.get(email);

  if (!storedOTP) {
    return res.status(400).json({ error: 'No OTP found for this email' });
  }

  if (Date.now() - storedOTP.createdAt > 600000) { // 10 minutes expiration
    otpStorage.delete(email);
    return res.status(400).json({ error: 'OTP has expired' });
  }

  if (storedOTP.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  otpStorage.delete(email);
  res.json({ message: 'OTP verified successfully' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

