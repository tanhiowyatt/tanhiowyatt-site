/**
 * Secure HTTP Server Configuration
 * Adds security headers to all responses and CSRF protection
 */

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csrf = require('csrf');

const app = express();
const PORT = process.env.PORT || 5173;

// Initialize CSRF protection
const csrfProtection = new csrf();

// Parse cookies and JSON bodies for CSRF protection
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use Helmet to set various HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      fontSrc: ["'self'", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Additional security headers
app.use((req, res, next) => {
  // Strict Transport Security
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Clickjacking protection
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
});

// CSRF protection middleware for state-changing requests
// Only apply to POST, PUT, DELETE, PATCH methods
app.use((req, res, next) => {
  // Skip CSRF for safe methods (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get or create CSRF secret from cookie
  let secret = req.cookies._csrf;
  if (!secret) {
    secret = csrfProtection.secretSync();
    res.cookie('_csrf', secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });
  }

  // Get CSRF token from request (body, header, or query)
  const token = req.body._csrf || req.headers['x-csrf-token'] || req.query._csrf;

  if (!token) {
    // If no token provided, reject the request
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  // Verify token
  if (!csrfProtection.verify(secret, token)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
});

// Generate CSRF token endpoint (for forms that need it)
app.get('/api/csrf-token', (req, res) => {
  // Get or create CSRF secret
  let secret = req.cookies._csrf;
  if (!secret) {
    secret = csrfProtection.secretSync();
    res.cookie('_csrf', secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });
  }

  // Generate token from secret
  const token = csrfProtection.create(secret);
  res.json({ csrfToken: token });
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// 404 handler
app.use((req, res) => {
  res.status(404).send('404 - File Not Found');
});

// Start server
app.listen(PORT, () => {
  console.log(`Secure server running at http://localhost:${PORT}`);
  console.log('Security headers enabled:');
  console.log('  - Content Security Policy');
  console.log('  - Strict-Transport-Security (HSTS)');
  console.log('  - X-Content-Type-Options');
  console.log('  - X-Frame-Options');
  console.log('  - X-XSS-Protection');
  console.log('  - Referrer-Policy');
  console.log('  - Permissions-Policy');
  console.log('  - CSRF Protection (for state-changing requests)');
});
