# Security Configuration Guide

## Overview
This document outlines the security measures implemented in the tanhio.dev website.

## Implemented Security Features

### 1. Subresource Integrity (SRI) ✅
- All external CDN resources include integrity hashes
- Protects against Man-in-the-Middle (MITM) attacks
- Resources: Leaflet (external + SRI), Tailwind CSS (local), Bootstrap Icons (local), DOMPurify (local), Google Fonts (local)

### 2. Content Security Policy (CSP) ✅
- Strict CSP headers configured to prevent XSS attacks
- Whitelisted sources for scripts, styles, and other resources
- frame-ancestors: 'none' prevents clickjacking
- upgrade-insecure-requests ensures HTTPS usage

### 3. HTML Sanitization ✅
- DOMPurify library integrated for HTML content sanitization
- Custom sanitization module: `assets/utils/sanitize-html.js`
- Markdown content is sanitized before rendering
- XSS protection for user-generated content

### 4. Input Validation ✅
- Security utilities: `assets/utils/security.js`
- URL validation (prevents javascript:, data: URLs)
- Input sanitization functions
- Form validation with dangerous pattern detection

### 5. HTTP Security Headers ✅
- **Strict-Transport-Security (HSTS)**: Forces HTTPS
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Clickjacking protection
- **X-XSS-Protection**: XSS protection for older browsers
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts browser features

### 6. External Links Security ✅
- All external links use `rel="noopener noreferrer"`
- Prevents access to window.opener from external sites

### 7. robots.txt Configuration ✅
- Blocks AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.)
- Disallows sensitive paths (admin, auth, API)
- Prevents query parameters with sensitive data

## Server Configuration

### Option 1: Node.js with Express + Helmet
```bash
npm install express helmet
node server.js
```
The `server.js` file includes all security headers using Helmet middleware.

### Option 2: Apache with .htaccess
The `.htaccess` file includes:
- Security headers configuration
- GZIP compression
- Cache control
- Directory listing disabled
- HTTPS redirect

### Option 3: NGINX
The `nginx.conf` file includes:
- Security headers
- SSL/TLS configuration
- Rate limiting (100 req/10s per IP)
- GZIP compression
- Caching policies

## Recommended Implementation Steps

1. **Install DOMPurify** (if using external server):
   ```html
   <script src="assets/vendor/js/purify.min.js"></script>
   ```

2. **Deploy with Security Headers**:
   - Choose your server (Express, Apache, or NGINX)
   - Copy appropriate configuration file
   - Update domain names and SSL certificate paths

3. **Enable HTTPS**:
   - Use Let's Encrypt for free SSL certificates
   - Ensure HSTS header is properly set

4. **Set Up Rate Limiting** (NGINX or WAF):
   - Protect against brute force attacks
   - Limit requests per IP address

5. **Monitor CSP Violations**:
   - Consider adding CSP-Report-Only header initially
   - Monitor console for CSP violations
   - Adjust policy as needed

## Testing Security

### CSP Testing
- Open browser DevTools (F12)
- Check for CSP violations in console
- Verify no external resources are blocked

### SRI Testing
- Disable JavaScript in DevTools
- Verify page still loads (SRI protection is working)
- Re-enable JavaScript

### Security Headers Testing
- Use https://securityheaders.com
- Paste your domain URL
- Review the security grade

### XSS Testing
- Test input fields with: `<script>alert('xss')</script>`
- Verify script doesn't execute
- Check sanitized output

## Remaining Considerations

### To Do
1. Remove 'unsafe-inline' from CSP (requires moving inline styles to external file)
2. Add database input validation (if applicable)
3. Implement rate limiting on backend
4. Set up security scanning in CI/CD pipeline
5. Regular security audits and dependency updates

### Recommended Tools
- OWASP ZAP: Security scanning tool
- Burp Suite: Web vulnerability scanner
- npm audit: Check for vulnerable dependencies
- Snyk: Dependency vulnerability monitoring

## CSP Violations Debugging

If you see CSP violations in console:

1. **Script blocked**: 
   - Check `script-src` directive
   - May need to add hash or nonce

2. **Style blocked**:
   - Check `style-src` directive
   - Inline styles need special handling

3. **Image blocked**:
   - Check `img-src` directive
   - Verify image protocol (http/https/data)

## Response Headers Example

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self'; ...
```

## Support & Updates

- Check package.json for dependency versions
- Update npm packages regularly: `npm update`
- Review security advisories: `npm audit`
- Monitor GitHub security alerts

For questions or security concerns, contact: contact@tanhio.dev
