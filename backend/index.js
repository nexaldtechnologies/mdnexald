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

app.use(cors());
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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
