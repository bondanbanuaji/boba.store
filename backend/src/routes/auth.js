const express = require('express');
const { toNodeHandler } = require('better-auth/node');
const { auth } = require('../lib/auth');

const router = express.Router();

// Mount Better Auth handler for all auth routes
router.all('/*', toNodeHandler(auth));

module.exports = router;
