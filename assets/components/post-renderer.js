// Blog post renderer - handles individual MDX post rendering

// Parse frontmatter from MDX content
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, content: content.trim() };
  }

  const frontmatterText = match[1];
  const contentText = match[2];
  const frontmatter = {};

  // Simple YAML-like parsing for frontmatter
  frontmatterText.split('\n').forEach(line => {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      frontmatter[key] = value;
    }
  });

  return { frontmatter, content: contentText.trim() };
}

// Convert MDX/Markdown to HTML (enhanced version)
function markdownToHTML(markdown) {
  let html = markdown;

  // Images - MUST be processed FIRST, before links or other inline elements
  // Use a placeholder to avoid conflicts
  const imagePlaceholders = [];
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    // Escape alt text
    const escapedAlt = (alt || '').replace(/"/g, '&quot;');

    // If it's already an absolute URL, use as is
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
      const imgTag = `<img src="${src}" alt="${escapedAlt}" loading="lazy" class="blog-image" />`;
      const placeholder = `__IMAGE_PLACEHOLDER_${imagePlaceholders.length}__`;
      imagePlaceholders.push(imgTag);
      return placeholder;
    }

    // If it starts with /, it's absolute from root, use as is
    if (src.startsWith('/')) {
      const imgTag = `<img src="${src}" alt="${escapedAlt}" loading="lazy" class="blog-image" />`;
      const placeholder = `__IMAGE_PLACEHOLDER_${imagePlaceholders.length}__`;
      imagePlaceholders.push(imgTag);
      return placeholder;
    }

    // Relative paths: convert to absolute paths from root
    // From /blog/post.html, ../images/image.jpg should resolve to /blog/images/image.jpg
    // From /blog/post.html, images/image.jpg should resolve to /blog/images/image.jpg
    let imagePath = src;

    // If path starts with ../images/, convert to absolute path /blog/images/
    if (src.startsWith('../images/')) {
      const imageName = src.replace('../images/', '');
      imagePath = `/blog/images/${imageName}`;
    }
    // If path starts with ../, but not ../images/, try to resolve it
    else if (src.startsWith('../')) {
      // For other ../ paths, try to resolve relative to current location
      const currentDir = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
      imagePath = `${currentDir}/${src.replace('../', '')}`;
    }
    // If path starts with ./images/, convert to absolute path
    else if (src.startsWith('./images/')) {
      const imageName = src.replace('./images/', '');
      imagePath = `/blog/images/${imageName}`;
    }
    // If no leading ../ or ./, try common locations
    else if (!src.startsWith('/')) {
      const isInBlogDir = window.location.pathname.includes('/blog/');
      // Try common image directories - blog/images is where blog images are stored
      if (isInBlogDir) {
        // From blog/post.html, use absolute path
        imagePath = `/blog/images/${src}`;
      } else {
        // From root, use blog/images/ or pics/
        imagePath = `/blog/images/${src}`;
      }
    }

    // Debug: log image path for troubleshooting
    console.log('Image path resolved:', src, '->', imagePath, '| Current path:', window.location.pathname);

    // Don't use inline event handlers - add event listeners after rendering instead
    const imgTag = `<img src="${imagePath}" alt="${escapedAlt}" loading="lazy" class="blog-image" data-img-src="${imagePath}" />`;
    const placeholder = `__IMAGE_PLACEHOLDER_${imagePlaceholders.length}__`;
    imagePlaceholders.push(imgTag);
    return placeholder;
  });

  // Headers (process from largest to smallest)
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr />');
  html = html.replace(/^\*\*\*$/gim, '<hr />');

  // Code blocks (must be before inline code)
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    const lines = code.split('\n');
    const lang = lines[0].trim();
    const codeContent = lines.slice(1).join('\n').trim();
    return `<pre><code>${escapeHtml(codeContent)}</code></pre>`;
  });

  // Inline code - escape HTML to prevent XSS
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    return `<code>${escapeHtml(code)}</code>`;
  });

  // Bold and italic (process bold first, then italic)
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links (must be after images to avoid conflicts) - escape to prevent XSS
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    // Escape text and URL to prevent XSS
    const safeText = escapeHtml(text);
    const safeUrl = escapeHtml(url);
    // Only allow http, https, and relative URLs
    if (safeUrl.startsWith('javascript:') || safeUrl.startsWith('data:') || safeUrl.startsWith('vbscript:')) {
      return safeText; // Return just text if dangerous protocol
    }
    return `<a href="${safeUrl}">${safeText}</a>`;
  });

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gim, '<blockquote>$1</blockquote>');

  // Ordered lists
  html = html.replace(/^(\d+)\.\s+(.+)$/gim, '<li>$2</li>');
  const olRegex = /(<li>.*<\/li>\n?)+/g;
  html = html.replace(olRegex, (match) => {
    return '<ol>' + match.replace(/\n/g, '') + '</ol>';
  });

  // Unordered lists
  html = html.replace(/^[-*]\s+(.+)$/gim, '<li>$1</li>');
  const ulRegex = /(<li>.*<\/li>\n?)+/g;
  html = html.replace(ulRegex, (match) => {
    if (!match.includes('</ol>')) {
      return '<ul>' + match.replace(/\n/g, '') + '</ul>';
    }
    return match;
  });

  // Paragraphs (wrap lines that aren't already wrapped)
  const lines = html.split('\n');
  let result = [];
  let currentPara = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentPara.length > 0) {
        result.push('<p>' + currentPara.join(' ') + '</p>');
        currentPara = [];
      }
    } else if (trimmed.match(/^<[ou]l>|<h[1-6]|<blockquote|<pre|<hr|__IMAGE_PLACEHOLDER_/)) {
      // This line is already wrapped or is an image placeholder
      if (currentPara.length > 0) {
        result.push('<p>' + currentPara.join(' ') + '</p>');
        currentPara = [];
      }
      result.push(line);
    } else if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      // HTML tag - push as is
      if (currentPara.length > 0) {
        result.push('<p>' + currentPara.join(' ') + '</p>');
        currentPara = [];
      }
      result.push(line);
    } else {
      currentPara.push(trimmed);
    }
  });

  if (currentPara.length > 0) {
    result.push('<p>' + currentPara.join(' ') + '</p>');
  }

  html = result.join('\n');

  // Replace image placeholders with actual image tags
  imagePlaceholders.forEach((imgTag, index) => {
    html = html.replace(`__IMAGE_PLACEHOLDER_${index}__`, imgTag);
  });

  // Ensure images are not wrapped in paragraphs - extract them if needed
  // This handles cases where images might be in paragraphs
  html = html.replace(/<p>([^<]*)<img([^>]+)>([^<]*)<\/p>/g, (match, before, imgAttrs, after) => {
    let result = '';
    if (before.trim()) {
      result += `<p>${before.trim()}</p>\n`;
    }
    result += `<img${imgAttrs}>`;
    if (after.trim()) {
      result += `\n<p>${after.trim()}</p>`;
    }
    return result;
  });

  // Also handle images that might be wrapped in paragraphs with only whitespace
  html = html.replace(/<p>\s*<img([^>]+)>\s*<\/p>/g, '<img$1>');

  // Clean up nested lists
  html = html.replace(/<\/li>\n<li>/g, '</li><li>');
  html = html.replace(/<ol>\s*<li>/g, '<ol><li>');
  html = html.replace(/<\/li>\s*<\/ol>/g, '</li></ol>');
  html = html.replace(/<ul>\s*<li>/g, '<ul><li>');
  html = html.replace(/<\/li>\s*<\/ul>/g, '</li></ul>');

  // Clean up blockquotes
  html = html.replace(/<blockquote>\s*<blockquote>/g, '<blockquote>');
  html = html.replace(/<\/blockquote>\s*<\/blockquote>/g, '</blockquote>');

  return html;
}

// Escape HTML for code blocks
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Get post slug from URL
function getPostSlug() {
  const path = window.location.pathname;
  const hash = window.location.hash;
  const search = window.location.search;

  // Try to get slug from path
  // Patterns: /blog/post.html, blog/post.html, /blog/post, blog/post
  let match = path.match(/(?:^|\/)blog\/([^/]+)(?:\.html)?$/);
  if (match) {
    return match[1];
  }

  // Try to get from filename if we're directly on a post page
  match = path.match(/\/([^/]+)\.html$/);
  if (match) {
    // Check if it's in the blog directory by checking if parent path contains 'blog'
    const currentDir = path.substring(0, path.lastIndexOf('/'));
    if (currentDir.includes('blog') || currentDir.endsWith('blog')) {
      return match[1];
    }
  }

  // Try query parameter as fallback
  if (search) {
    const params = new URLSearchParams(search);
    return params.get('slug') || params.get('post');
  }

  return null;
}

// Get correct path to MDX file based on current page location
function getPostPath(slug) {
  const path = window.location.pathname;
  const currentDir = path.substring(0, path.lastIndexOf('/') + 1);

  // Debug logging
  console.log('Current path:', path);
  console.log('Current dir:', currentDir);

  // If we're in /blog/ directory, use relative path to posts/
  if (path.includes('/blog/') && path !== '/blog.html') {
    // We're at /blog/post.html, so posts/slug.mdx should resolve to /blog/posts/slug.mdx
    return `posts/${slug}.mdx`;
  }

  // If we're at the root, use blog/posts/slug.mdx
  if (path === '/' || !path.includes('/blog')) {
    return `blog/posts/${slug}.mdx`;
  }

  // Fallback: try relative path first, then absolute
  // From /blog/post.html, ../blog/posts/slug.mdx would go up and then down
  // But posts/slug.mdx should work if we're in /blog/
  return `posts/${slug}.mdx`;
}

// Load and render blog post
async function loadBlogPost() {
  const postContainer = document.getElementById('blog-post-content');
  const postHeader = document.getElementById('blog-post-header');

  if (!postContainer) return;

  const slug = getPostSlug();
  if (!slug) {
    console.error('Could not determine post slug from URL:', window.location.pathname);
    const errorMsg = document.createElement('p');
    errorMsg.className = 'text-slate-400';
    errorMsg.textContent = 'Post not found. Could not determine post slug.';
    postContainer.textContent = '';
    postContainer.appendChild(errorMsg);
    return;
  }

  let postPath = getPostPath(slug);
  console.log('Loading post:', slug, 'from path:', postPath);

  // Build path variations based on current location
  const pathVariations = new Set();
  const isInBlogDir = window.location.pathname.includes('/blog/') &&
    window.location.pathname !== '/blog.html';

  // Always try the calculated path first
  pathVariations.add(postPath);

  if (isInBlogDir) {
    // From /blog/post.html, try these:
    pathVariations.add(`posts/${slug}.mdx`); // /blog/posts/slug.mdx
    pathVariations.add(`./posts/${slug}.mdx`); // /blog/posts/slug.mdx
    pathVariations.add(`/blog/posts/${slug}.mdx`); // Absolute path
  } else {
    // From root or other locations:
    pathVariations.add(`blog/posts/${slug}.mdx`); // blog/posts/slug.mdx
    pathVariations.add(`/blog/posts/${slug}.mdx`); // Absolute path
  }

  // Convert Set to Array for iteration
  const pathArray = Array.from(pathVariations);

  let response = null;
  let successfulPath = null;
  let lastError = null;

  for (const path of pathArray) {
    try {
      console.log('Trying path:', path);
      const testResponse = await fetch(path);
      if (testResponse.ok) {
        response = testResponse;
        successfulPath = path;
        console.log('Successfully loaded from:', path);
        break;
      } else {
        console.warn(`Path ${path} returned ${testResponse.status}`);
      }
    } catch (error) {
      lastError = error;
      console.warn('Failed to load from', path, error);
      continue;
    }
  }

  try {
    if (!response || !response.ok) {
      console.error('All path attempts failed. Last error:', lastError);
      console.error('Tried paths:', pathArray);
      console.error('Current location:', window.location.href);
      throw new Error(`Post not found. Tried: ${pathArray.join(', ')}`);
    }

    const content = await response.text();
    const { frontmatter, content: markdownContent } = parseFrontmatter(content);

    // Update page title
    if (frontmatter.title) {
      document.title = `${frontmatter.title} — tanhiowyatt`;
    }


    // Render header - escape HTML to prevent XSS
    if (postHeader) {
      const safeTitle = escapeHtml(frontmatter.title || 'Untitled');
      const safeDate = frontmatter.date
        ? escapeHtml(new Date(frontmatter.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
        : '';

      const headerHTML = `
        <h1>${safeTitle}</h1>
        ${safeDate ? `<div class="blog-post-header-date">${safeDate}</div>` : ''}
      `;
      SanitizeHTML.setSafeHTML(postHeader, headerHTML);
    }

    // Render content - sanitize before setting content
    const htmlContent = markdownToHTML(markdownContent);
    SanitizeHTML.setSafeHTML(postContainer, htmlContent);

    // Add error handlers for images safely (avoid inline handlers)
    const images = postContainer.querySelectorAll('.blog-image');
    images.forEach(img => {
      img.addEventListener('error', function () {
        console.error('Failed to load image:', this.src);
        // Optionally add a fallback class for styling broken images
        this.classList.add('image-error');
      });
    });

    // Update meta tags - escape content for safety
    if (frontmatter.excerpt) {
      const safeExcerpt = escapeHtml(frontmatter.excerpt);

      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.content = safeExcerpt;
      }
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) {
        ogDesc.content = safeExcerpt;
      }
    }

  } catch (error) {
    console.error('Error loading blog post:', error);
    const errorMsg = document.createElement('p');
    errorMsg.className = 'text-slate-400';
    errorMsg.textContent = 'Error loading post. Please try again later.';
    postContainer.textContent = '';
    postContainer.appendChild(errorMsg);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadBlogPost);
} else {
  loadBlogPost();
}


