const { Router } = require('express');
const router = Router();
const handlers = require('./handlers/main.ts');

router.get('/api/next-tournament', handlers.getNextTournament);


module.exports = router;
