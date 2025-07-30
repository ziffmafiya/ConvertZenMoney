const router = require('./router');

module.exports = (req, res) => {
  // Vercel expects a function with (req, res) signature
  router(req, res, () => {
    // If no route matches, send 404
    res.status(404).send('Endpoint not found');
  });
};
