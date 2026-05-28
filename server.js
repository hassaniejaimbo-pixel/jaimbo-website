import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Store submissions in JSON file (for demo; use database in production)
const submissionsFile = path.join(__dirname, '../data/submissions.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize submissions file if it doesn't exist
if (!fs.existsSync(submissionsFile)) {
  fs.writeFileSync(submissionsFile, JSON.stringify([], null, 2));
}

// API Routes

/**
 * POST /api/contact
 * Handle contact form submissions
 */
app.post('/api/contact', (req, res) => {
  try {
    const { firstName, lastName, email, subject, message } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address',
      });
    }

    // Create submission object
    const submission = {
      id: Date.now(),
      firstName,
      lastName,
      email,
      subject,
      message,
      timestamp: new Date().toISOString(),
      status: 'new',
    };

    // Read existing submissions
    let submissions = [];
    if (fs.existsSync(submissionsFile)) {
      const data = fs.readFileSync(submissionsFile, 'utf-8');
      submissions = JSON.parse(data);
    }

    // Add new submission
    submissions.push(submission);

    // Save to file
    fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2));

    // TODO: Send email notification to admin
    // TODO: Send confirmation email to user

    res.json({
      success: true,
      message: 'Message received! We will get back to you soon.',
      submissionId: submission.id,
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again later.',
    });
  }
});

/**
 * GET /api/submissions
 * Get all contact form submissions (admin only in production)
 */
app.get('/api/submissions', (req, res) => {
  try {
    if (fs.existsSync(submissionsFile)) {
      const data = fs.readFileSync(submissionsFile, 'utf-8');
      const submissions = JSON.parse(data);
      res.json({
        success: true,
        count: submissions.length,
        submissions,
      });
    } else {
      res.json({
        success: true,
        count: 0,
        submissions: [],
      });
    }
  } catch (error) {
    console.error('Error reading submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error reading submissions',
    });
  }
});

/**
 * GET /api/stats
 * Get website statistics
 */
app.get('/api/stats', (req, res) => {
  try {
    const stats = {
      followers: 84000,
      topReactions: 3200,
      comments: 226,
      verified: true,
      platform: 'Facebook',
      uptime: '99.9%',
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Jaimbo website running on http://localhost:${PORT}`);
  console.log(`📧 Contact submissions: ${submissionsFile}`);
});
