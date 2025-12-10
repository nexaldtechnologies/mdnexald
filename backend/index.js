const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const blogsRoutes = require('./routes/blogs');
const subscriptionsRoutes = require('./routes/subscriptions');
const crmRoutes = require('./routes/crm');
const usersRoutes = require('./routes/users');
const webhooksRoutes = require('./routes/webhooks');
const settingsRoutes = require('./routes/settings');
const referralRoutes = require('./routes/referrals');
const chatRoutes = require('./routes/chat');

const app = express();
const port = process.env.PORT || 3000;

// Mount webhooks BEFORE express.json()
app.use('/api/webhooks', webhooksRoutes);

// CORS Configuration
const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_ALT,
    "http://localhost:5173", // Always allow local Vite dev
    "http://localhost:3000"  // Always allow local backend access if needed
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); // Allow non-browser clients (e.g. server-to-server)

        if (
            allowedOrigins.includes(origin) ||
            origin.startsWith("https://nexaldtechnologies-mdnexald-") // Allow Vercel previews
        ) {
            return callback(null, true);
        }

        console.warn(`CORS blocked origin: ${origin}`); // Helpful for debugging
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // Enable preflight for all routes
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded images

app.use('/api/blogs', blogsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes.router);
app.use('/api/settings', settingsRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

module.exports = app;
