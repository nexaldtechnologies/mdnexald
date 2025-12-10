const hasUnlimitedAccess = (user) => {
    if (!user) return false;

    // Roles that always have unlimited access
    const privilegedRoles = ['admin', 'team', 'friend', 'family', 'ambassador'];
    // Normalize role to lowercase just in case
    const userRole = (user.role || 'user').toLowerCase();

    if (privilegedRoles.includes(userRole)) return true;

    // Users with lifetime access
    if (user.has_lifetime_access === true) return true;

    // Active subscribers
    if (user.subscription_status === 'active' || user.subscription_status === 'trial') return true;

    return false;
};

const requireAdmin = (req, res, next) => {
    const user = req.user;

    if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userRole = (user.role || 'user').toLowerCase();

    // Only 'admin' or 'team' can manage blogs
    if (userRole !== 'admin' && userRole !== 'team') {
        return res.status(403).json({ error: 'Permission denied: Admin or Team access required' });
    }

    next();
};

module.exports = { hasUnlimitedAccess, requireAdmin };
