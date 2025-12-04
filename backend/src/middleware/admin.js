const { db } = require('../lib/db');
const { profiles } = require('../db/schema');
const { eq } = require('drizzle-orm');

const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [profile] = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, req.user.id))
      .limit(1);

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.profile = profile;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
};

const resellerMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [profile] = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, req.user.id))
      .limit(1);

    if (!profile || !['admin', 'reseller'].includes(profile.role)) {
      return res.status(403).json({ error: 'Reseller or Admin access required' });
    }

    req.profile = profile;
    next();
  } catch (error) {
    console.error('Reseller middleware error:', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
};

const roleMiddleware = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const [profile] = await db
        .select({ role: profiles.role })
        .from(profiles)
        .where(eq(profiles.id, req.user.id))
        .limit(1);

      if (!profile || !allowedRoles.includes(profile.role)) {
        return res.status(403).json({ error: `Required role: ${allowedRoles.join(' or ')}` });
      }

      req.profile = profile;
      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({ error: 'Authorization failed' });
    }
  };
};

module.exports = {
  adminMiddleware,
  resellerMiddleware,
  roleMiddleware,
};
