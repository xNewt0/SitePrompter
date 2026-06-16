(function () {
  if (window.__SCP_LOADED__) {
    chrome.runtime.onMessage.addListener(handleMessage);
    return;
  }
  window.__SCP_LOADED__ = true;

  function handleMessage(msg, _sender, sendResponse) {
    if (msg.action === 'GENERATE_PROMPT') {
      try {
        const data = extractAll();
        const prompt = buildPrompt(data);
        sendResponse({ prompt });
      } catch (e) {
        sendResponse({ error: e.message });
      }
      return true;
    }
  }

  chrome.runtime.onMessage.addListener(handleMessage);

  /* ─── EXTRACTION ─────────────────────────────── */

  function extractAll() {
    return {
      meta: extractMeta(),
      framework: detectFramework(),
      cssVariables: extractCSSVariables(),
      colors: extractColors(),
      fonts: extractFonts(),
      shadows: extractShadows(),
      borderRadius: extractBorderRadius(),
      images: extractImages(),
      layout: extractLayoutInfo(),
      animations: extractAnimations(),
      domStructure: extractDOMStructure(),
      fullCSS: extractFullCSS(),
      components: extractComponents(),
      typography: extractTypography(),
      spacing: extractSpacing(),
      external: extractExternal(),
      interactions: detectInteractions(),
      responsive: detectResponsive(),
      accessibilityHints: extractAccessibility(),
    };
  }

  function extractMeta() {
    const getMeta = (attr, val) =>
      document.querySelector(`meta[${attr}="${val}"]`)?.content || '';
    return {
      title: document.title,
      description: getMeta('name', 'description'),
      keywords: getMeta('name', 'keywords'),
      ogTitle: getMeta('property', 'og:title'),
      ogDescription: getMeta('property', 'og:description'),
      ogImage: getMeta('property', 'og:image'),
      twitterCard: getMeta('name', 'twitter:card'),
      canonical: document.querySelector('link[rel="canonical"]')?.href || location.href,
      lang: document.documentElement.lang || 'unknown',
      themeColor: getMeta('name', 'theme-color'),
      viewport: getMeta('name', 'viewport'),
    };
  }

  function detectFramework() {
    const detected = [];
    if (window.React || document.querySelector('[data-reactroot],[data-reactid]')) detected.push('React');
    if (window.__vue__ || window.Vue || document.querySelector('[data-v-app]')) detected.push('Vue');
    if (window.angular || window.ng || document.querySelector('[ng-version],[ng-app]')) detected.push('Angular');
    if (window.__svelte || document.querySelector('[class*="svelte-"]')) detected.push('Svelte');
    if (window.next || document.querySelector('#__next')) detected.push('Next.js');
    if (window.nuxt || document.querySelector('#__nuxt')) detected.push('Nuxt.js');
    if (window.___gatsby) detected.push('Gatsby');
    if (window.jQuery || window.$?.fn?.jquery) detected.push('jQuery ' + (window.jQuery?.fn?.jquery || ''));
    if (window.gsap) detected.push('GSAP');
    if (window.Swiper || document.querySelector('.swiper')) detected.push('Swiper.js');
    if (window.Alpine) detected.push('Alpine.js');

    const hasTailwind = Array.from(document.querySelectorAll('[class]'))
      .some(el => /\b(flex|grid|text-\w+|bg-\w+|p-\d|m-\d|rounded|shadow)\b/.test(el.className));
    if (hasTailwind) detected.push('Tailwind CSS');

    const hasBootstrap = document.querySelector('[class*="col-"],[class*="container"],[class*="navbar-"]');
    if (hasBootstrap) detected.push('Bootstrap');

    return detected.length ? detected.join(', ') : 'Vanilla JS';
  }

  function extractCSSVariables() {
    const vars = {};
    try {
      const rootStyles = getComputedStyle(document.documentElement);
      const sheet = Array.from(document.styleSheets).find(s => {
        try { return s.cssRules; } catch { return false; }
      });
      if (sheet) {
        Array.from(sheet.cssRules || []).forEach(rule => {
          if (rule.selectorText === ':root') {
            const text = rule.cssText;
            const matches = text.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g);
            for (const m of matches) vars['--' + m[1]] = m[2].trim();
          }
        });
      }
    } catch (e) {}
    return vars;
  }

  function extractColors() {
    const colorMap = {};
    const elements = Array.from(document.querySelectorAll('*')).slice(0, 400);
    elements.forEach(el => {
      const cs = getComputedStyle(el);
      const tag = el.tagName.toLowerCase();
      ['color', 'backgroundColor', 'borderColor'].forEach(prop => {
        const val = cs[prop];
        if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent' && val !== 'rgba(0,0,0,0)') {
          colorMap[val] = (colorMap[val] || 0) + 1;
        }
      });
    });
    return Object.entries(colorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([color, freq]) => ({ color, frequency: freq }));
  }

  function extractFonts() {
    const fontFamilies = new Set();
    const fontSizes = new Set();
    Array.from(document.querySelectorAll('*')).slice(0, 200).forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.fontFamily) fontFamilies.add(cs.fontFamily);
      if (cs.fontSize) fontSizes.add(cs.fontSize);
    });
    const fontLinks = Array.from(document.querySelectorAll('link[href*="font"],link[href*="typeface"]')).map(l => l.href);
    const fontFaces = Array.from(document.querySelectorAll('style'))
      .flatMap(s => [...(s.textContent.match(/@font-face\s*\{[^}]+\}/g) || [])])
      .join('\n');
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules || []).forEach(rule => {
            if (rule.type === CSSRule.FONT_FACE_RULE) fontFaces.concat(rule.cssText);
          });
        } catch {}
      });
    } catch {}
    return {
      families: Array.from(fontFamilies).slice(0, 15),
      sizes: [...new Set(Array.from(fontSizes))].sort((a,b) => parseFloat(b)-parseFloat(a)).slice(0, 12),
      links: fontLinks,
      fontFaces: fontFaces.slice(0, 3000)
    };
  }

  function extractShadows() {
    const shadows = new Set();
    Array.from(document.querySelectorAll('*')).slice(0, 300).forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.boxShadow && cs.boxShadow !== 'none') shadows.add(cs.boxShadow);
      if (cs.textShadow && cs.textShadow !== 'none') shadows.add('text: ' + cs.textShadow);
      if (cs.filter && cs.filter !== 'none' && cs.filter.includes('drop-shadow')) shadows.add('filter: ' + cs.filter);
    });
    return Array.from(shadows).slice(0, 15);
  }

  function extractBorderRadius() {
    const radii = new Set();
    Array.from(document.querySelectorAll('button,[class*="btn"],[class*="card"],[class*="tag"],[class*="badge"],img,input')).slice(0, 80).forEach(el => {
      const r = getComputedStyle(el).borderRadius;
      if (r && r !== '0px') radii.add(r);
    });
    return Array.from(radii).slice(0, 10);
  }

  function extractImages() {
    const imgs = Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.currentSrc || img.src,
      alt: img.alt,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      loading: img.loading,
      role: img.closest('[class*="logo"]') ? 'logo' : img.closest('[class*="avatar"]') ? 'avatar' : img.closest('[class*="banner"],[class*="hero"]') ? 'hero' : 'content'
    })).filter(i => i.src && !i.src.startsWith('data:'));

    const bgImages = [];
    Array.from(document.querySelectorAll('*')).slice(0, 400).forEach(el => {
      const bg = getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none' && bg.includes('url(')) {
        const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (match && !match[1].startsWith('data:')) bgImages.push(match[1]);
      }
    });

    const svgCount = document.querySelectorAll('svg').length;
    const svgSamples = Array.from(document.querySelectorAll('svg')).slice(0, 5).map(s => s.outerHTML.slice(0, 200));
    const iconLinks = Array.from(document.querySelectorAll('link[rel*="icon"]')).map(l => l.href);

    return {
      imgs: imgs.slice(0, 50),
      bgImages: [...new Set(bgImages)].slice(0, 25),
      svgCount,
      svgSamples,
      iconLinks
    };
  }

  function extractLayoutInfo() {
    const body = document.body;
    const html = document.documentElement;
    const semanticTags = ['header', 'nav', 'main', 'footer', 'aside', 'section', 'article', 'dialog', 'figure'];
    const sections = semanticTags.map(tag => {
      const els = document.querySelectorAll(tag);
      return els.length ? `${tag}: ${els.length}` : null;
    }).filter(Boolean);

    const gridEls = [], flexEls = [];
    Array.from(document.querySelectorAll('*')).slice(0, 400).forEach(el => {
      const cs = getComputedStyle(el);
      const identifier = el.tagName.toLowerCase() + (el.id ? '#' + el.id : el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : '');
      if (cs.display === 'grid') {
        gridEls.push({ el: identifier, cols: cs.gridTemplateColumns, rows: cs.gridTemplateRows, gap: cs.gap });
      }
      if (cs.display === 'flex') {
        flexEls.push({ el: identifier, direction: cs.flexDirection, wrap: cs.flexWrap, justify: cs.justifyContent, align: cs.alignItems });
      }
    });

    return {
      sections,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      totalHeight: Math.max(body.scrollHeight, html.scrollHeight),
      grids: [...new Map(gridEls.map(g => [g.el, g])).values()].slice(0, 10),
      flexboxes: [...new Map(flexEls.map(f => [f.el, f])).values()].slice(0, 10),
    };
  }

  function extractAnimations() {
    const animations = new Set();
    const transitions = new Set();
    Array.from(document.querySelectorAll('*')).slice(0, 400).forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.animationName && cs.animationName !== 'none')
        animations.add(`${cs.animationName} (duration: ${cs.animationDuration}, timing: ${cs.animationTimingFunction}, iteration: ${cs.animationIterationCount})`);
      if (cs.transition && cs.transition !== 'all 0s ease 0s' && cs.transition !== 'none')
        transitions.add(cs.transition);
    });

    const allKeyframes = [];
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules || []).forEach(rule => {
            if (rule.type === CSSRule.KEYFRAMES_RULE) allKeyframes.push(rule.cssText);
          });
        } catch {}
      });
    } catch {}

    return {
      animations: Array.from(animations).slice(0, 20),
      transitions: Array.from(transitions).slice(0, 20),
      keyframes: allKeyframes.join('\n').slice(0, 5000)
    };
  }

  function extractFullCSS() {
    const blocks = [];
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        if (sheet.href && !sheet.href.includes(location.hostname)) return;
        try {
          Array.from(sheet.cssRules || []).forEach(rule => {
            blocks.push(rule.cssText);
          });
        } catch {}
      });
    } catch {}
    const inlineStyles = Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n');
    return (blocks.join('\n') + '\n' + inlineStyles).slice(0, 15000);
  }

  function extractDOMStructure() {
    const IGNORE = new Set(['script', 'style', 'noscript', 'meta', 'link', 'title', 'head']);
    function serialize(node, depth) {
      if (depth > 6 || node.nodeType !== 1) return '';
      const tag = node.tagName.toLowerCase();
      if (IGNORE.has(tag)) return '';
      const id = node.id ? `#${node.id}` : '';
      const cls = node.className && typeof node.className === 'string'
        ? '.' + node.className.trim().split(/\s+/).slice(0, 4).join('.')
        : '';
      const attrs = [];
      ['href', 'src', 'type', 'role', 'aria-label', 'placeholder', 'data-component', 'data-section'].forEach(a => {
        if (node.getAttribute(a)) attrs.push(`${a}="${node.getAttribute(a).slice(0, 60)}"`);
      });
      const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
      const text = Array.from(node.childNodes)
        .filter(n => n.nodeType === 3 && n.textContent.trim().length > 1)
        .map(n => n.textContent.trim())
        .join(' ').slice(0, 100);
      const indent = '  '.repeat(depth);
      let line = `${indent}<${tag}${id}${cls}${attrStr}>${text ? ` "${text}"` : ''}`;
      const children = Array.from(node.children)
        .slice(0, 10)
        .map(c => serialize(c, depth + 1))
        .filter(Boolean)
        .join('\n');
      return children ? line + '\n' + children : line;
    }
    return serialize(document.body, 0).slice(0, 12000);
  }

  function extractComponents() {
    const found = [];
    const checks = [
      { name: 'Navigation / Navbar', sel: 'nav,[role="navigation"],[class*="navbar"],[class*="nav-bar"],[class*="topbar"]' },
      { name: 'Hero / Banner', sel: '[class*="hero"],[class*="banner"],[class*="jumbotron"],[class*="intro"],[class*="headline"]' },
      { name: 'Card Grid', sel: '[class*="card"],[class*="tile"],[class*="product-item"],[class*="post-card"]' },
      { name: 'Button', sel: 'button,[class*="btn"],[role="button"],[class*="cta"]' },
      { name: 'Form / Input', sel: 'form,input:not([type="hidden"]),textarea,select' },
      { name: 'Modal / Dialog', sel: '[class*="modal"],[class*="dialog"],[role="dialog"],[class*="overlay"]' },
      { name: 'Carousel / Slider', sel: '[class*="slider"],[class*="carousel"],[class*="swiper"],[class*="splide"]' },
      { name: 'Tabs', sel: '[role="tablist"],[class*="tabs"],[class*="tab-"]' },
      { name: 'Accordion / Collapse', sel: 'details,summary,[class*="accordion"],[class*="collapse"],[class*="expand"]' },
      { name: 'Dropdown / Menu', sel: '[class*="dropdown"],[class*="menu"],[class*="popover"]' },
      { name: 'Table', sel: 'table,thead,tbody' },
      { name: 'Sidebar', sel: 'aside,[class*="sidebar"],[class*="side-nav"]' },
      { name: 'Footer', sel: 'footer,[class*="footer"]' },
      { name: 'Breadcrumb', sel: '[class*="breadcrumb"],[aria-label*="breadcrumb"]' },
      { name: 'Notification / Toast', sel: '[class*="toast"],[class*="alert"],[class*="snackbar"],[role="alert"]' },
      { name: 'Search Bar', sel: '[class*="search"],[role="search"],input[type="search"]' },
      { name: 'Pagination', sel: '[class*="pagination"],[class*="pager"],[aria-label*="pagination"]' },
      { name: 'Progress / Loader', sel: '[class*="progress"],[class*="spinner"],[class*="skeleton"],[role="progressbar"]' },
      { name: 'Badge / Tag / Chip', sel: '[class*="badge"],[class*="tag"],[class*="chip"],[class*="label"]' },
      { name: 'Avatar / Profile Pic', sel: '[class*="avatar"],[class*="profile-pic"],[class*="user-img"]' },
      { name: 'Video / Media Player', sel: 'video,audio,[class*="player"],[class*="video-wrap"]' },
      { name: 'Map', sel: '[class*="map"],[id*="map"],iframe[src*="maps"]' },
    ];
    checks.forEach(({ name, sel }) => {
      try {
        const count = document.querySelectorAll(sel).length;
        if (count > 0) {
          const sample = document.querySelector(sel);
          const sampleClasses = sample?.className && typeof sample.className === 'string'
            ? sample.className.trim().split(/\s+/).slice(0, 4).join(' ') : '';
          found.push(`${name}: ${count}x (classes: "${sampleClasses}")`);
        }
      } catch {}
    });
    return found;
  }

  function extractTypography() {
    const typo = {};
    ['h1', 'h2', 'h3', 'h4', 'h5', 'p', 'a', 'button', 'li', 'span', 'label', 'small'].forEach(tag => {
      const el = document.querySelector(tag);
      if (el) {
        const cs = getComputedStyle(el);
        typo[tag] = {
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
          textTransform: cs.textTransform,
          color: cs.color
        };
      }
    });
    return typo;
  }

  function extractSpacing() {
    const unique = new Map();
    const importantEls = document.querySelectorAll('section,article,header,footer,main,aside,.container,.wrapper,.content');
    Array.from(importantEls).slice(0, 40).forEach(el => {
      const cs = getComputedStyle(el);
      const key = el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : '');
      unique.set(key, {
        el: key,
        padding: cs.padding,
        margin: cs.margin,
        gap: cs.gap,
        maxWidth: cs.maxWidth
      });
    });
    return Array.from(unique.values()).slice(0, 15);
  }

  function extractExternal() {
    const scripts = Array.from(document.querySelectorAll('script[src]'))
      .map(s => s.src)
      .filter(s => !s.includes('extension') && !s.includes('chrome-extension'));
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href);
    return { scripts: scripts.slice(0, 20), styles: styles.slice(0, 20) };
  }

  function detectInteractions() {
    const hints = [];
    if (document.querySelector('[class*="dropdown"],[class*="toggle"]')) hints.push('Dropdown menus');
    if (document.querySelector('[class*="modal"],[class*="lightbox"]')) hints.push('Modal / Lightbox');
    if (document.querySelector('[class*="carousel"],[class*="slider"],[class*="swiper"]')) hints.push('Carousel / Slider');
    if (document.querySelector('[class*="accordion"],[class*="collapse"],details')) hints.push('Accordion / Collapse');
    if (document.querySelector('[class*="tooltip"],[title]')) hints.push('Tooltips');
    if (document.querySelector('[data-aos],[class*="aos"],[class*="animate-on-scroll"]')) hints.push('Scroll animations (AOS)');
    if (document.querySelector('[class*="sticky"],[class*="fixed-top"]') ||
        Array.from(document.querySelectorAll('*')).some(el => getComputedStyle(el).position === 'sticky')) hints.push('Sticky header/nav');
    if (document.querySelector('[class*="parallax"]')) hints.push('Parallax scrolling');
    if (document.querySelector('[class*="lazy"],[loading="lazy"]')) hints.push('Lazy loading images');
    if (document.querySelector('form[class*="search"],input[type="search"]')) hints.push('Search with suggestions');
    if (document.querySelector('[class*="infinite"],[class*="load-more"]')) hints.push('Infinite scroll / Load more');
    if (window.IntersectionObserver && document.querySelector('[class*="reveal"],[class*="fade-in"],[class*="slide-up"]')) hints.push('Intersection observer animations');
    return hints;
  }

  function detectResponsive() {
    const breakpoints = [];
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules || []).forEach(rule => {
            if (rule.type === CSSRule.MEDIA_RULE) {
              const q = rule.conditionText || rule.media?.mediaText || '';
              if (q) breakpoints.push(q);
            }
          });
        } catch {}
      });
    } catch {}
    return [...new Set(breakpoints)].slice(0, 15);
  }

  function extractAccessibility() {
    const hints = [];
    if (document.querySelector('[aria-label],[aria-labelledby],[aria-describedby]')) hints.push('ARIA labels present');
    if (document.querySelector('[role]')) hints.push('Semantic roles used: ' + [...new Set(Array.from(document.querySelectorAll('[role]')).map(el => el.getAttribute('role')))].slice(0, 8).join(', '));
    if (document.querySelector('img[alt]')) hints.push('Images have alt text');
    if (document.querySelector(':focus-visible,[class*="focus-visible"]')) hints.push('focus-visible styling');
    return hints;
  }

  /* ─── PROMPT BUILDER ─────────────────────────── */

  function buildPrompt(d) {
    const {
      meta, framework, cssVariables, colors, fonts, shadows, borderRadius,
      images, layout, animations, domStructure, fullCSS,
      components, typography, spacing, external, interactions, responsive, accessibilityHints
    } = d;

    const topColors = colors.slice(0, 15).map(c => `  - ${c.color} (used ${c.frequency}x)`).join('\n');
    const cssVarsBlock = Object.entries(cssVariables).length
      ? Object.entries(cssVariables).map(([k, v]) => `  ${k}: ${v}`).join('\n')
      : '  (none detected)';
    const imageList = images.imgs.map(i =>
      `  - [${i.role.toUpperCase()}] ${i.src}${i.alt ? ` | alt="${i.alt}"` : ''} | ${i.width}x${i.height}`
    ).join('\n');
    const bgList = images.bgImages.map(u => `  - ${u}`).join('\n');
    const svgSamples = images.svgSamples.map((s, i) => `  SVG #${i + 1}: ${s}...`).join('\n');

    const typoBlock = Object.entries(typography).map(([tag, p]) =>
      `  <${tag}>: font-family: ${p.fontFamily} | size: ${p.fontSize} | weight: ${p.fontWeight} | line-height: ${p.lineHeight} | letter-spacing: ${p.letterSpacing} | text-transform: ${p.textTransform} | color: ${p.color}`
    ).join('\n');

    const gridBlock = layout.grids.map(g =>
      `  ${g.el} — columns: ${g.cols || 'auto'} | rows: ${g.rows || 'auto'} | gap: ${g.gap || 'none'}`
    ).join('\n');
    const flexBlock = layout.flexboxes.map(f =>
      `  ${f.el} — direction: ${f.direction} | wrap: ${f.wrap} | justify: ${f.justify} | align: ${f.align}`
    ).join('\n');

    const spacingBlock = spacing.map(s =>
      `  ${s.el} — padding: ${s.padding} | margin: ${s.margin} | gap: ${s.gap || 'none'} | max-width: ${s.maxWidth || 'none'}`
    ).join('\n');

    const animBlock = [
      animations.animations.length ? `  Active CSS Animations:\n${animations.animations.map(a => '    - ' + a).join('\n')}` : '',
      animations.transitions.length ? `  Transitions (sample):\n${animations.transitions.slice(0, 10).map(t => '    - ' + t).join('\n')}` : '',
      animations.keyframes ? `\n  Keyframe Definitions:\n\`\`\`css\n${animations.keyframes}\n\`\`\`` : ''
    ].filter(Boolean).join('\n');

    const responsiveBlock = responsive.length
      ? responsive.map(r => `  @media ${r}`).join('\n')
      : '  (none detected)';

    return `\
You are an elite frontend engineer and UI pixel-perfectionist. Recreate the website described below as a single, self-contained HTML file. All CSS goes in <style>, all JavaScript goes in <script>. Zero external files. Zero build steps. Use original asset URLs exactly as provided.

The output must be indistinguishable from the original when opened in Chrome. This prompt is designed to work equally well with ChatGPT, Claude, Gemini, and DeepSeek.

═══════════════════════════════════════════════════════════════
  SITE CLONE BRIEF — Generated by Site Clone Prompter
═══════════════════════════════════════════════════════════════

━━━ 1. SITE OVERVIEW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Title        : ${meta.title}
  URL          : ${meta.canonical}
  Language     : ${meta.lang}
  Description  : ${meta.description || '(none)'}
  Keywords     : ${meta.keywords || '(none)'}
  Theme Color  : ${meta.themeColor || '(none)'}
  OG Image     : ${meta.ogImage || '(none)'}
  Frameworks   : ${framework}
  Viewport     : ${layout.viewportWidth}px × ${layout.viewportHeight}px
  Page Height  : ${layout.totalHeight}px

━━━ 2. DESIGN TOKENS & CSS VARIABLES ━━━━━━━━━━━━━━━━━━━━━━━

CSS Custom Properties (:root):
${cssVarsBlock}

  Border Radius values in use:
  ${borderRadius.join(' | ') || '(none)'}

  Box Shadows in use:
  ${shadows.map(s => '  - ' + s).join('\n') || '  (none)'}

━━━ 3. COLOR PALETTE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  (sorted by frequency — most used first)
${topColors}

━━━ 4. TYPOGRAPHY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Type Scale (computed from elements):
${typoBlock}

  Font Families detected:
  ${fonts.families.slice(0, 8).join('\n  ')}

  Font Sizes scale:
  ${fonts.sizes.join(' | ')}

  External Font Sources:
  ${fonts.links.map(l => '  - ' + l).join('\n') || '  (none)'}

  @font-face declarations:
\`\`\`css
${fonts.fontFaces || '/* none */'}
\`\`\`

━━━ 5. LAYOUT SYSTEM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Semantic HTML sections:
  ${layout.sections.join(' | ') || 'none'}

  CSS Grid containers:
${gridBlock || '  (none)'}

  Flexbox containers:
${flexBlock || '  (none)'}

  Element spacing (padding / margin / gap / max-width):
${spacingBlock || '  (none)'}

━━━ 6. DOM STRUCTURE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Full hierarchy (depth 6, first 10 children per node):
\`\`\`
${domStructure}
\`\`\`

━━━ 7. COMPONENTS DETECTED ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${components.map(c => '  • ' + c).join('\n') || '  (none)'}

━━━ 8. INTERACTIONS & BEHAVIORS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Behavior patterns detected:
${interactions.map(i => '  • ' + i).join('\n') || '  (none)'}

  Replicate ALL of the following precisely:
  • Hover effects on buttons, links, cards, nav items
  • Click ripple / press effects on interactive elements
  • Dropdown open/close with smooth transition
  • Modal open/close with backdrop and animation
  • Carousel/slider with auto-play, prev/next controls, dot indicators
  • Accordion expand/collapse
  • Sticky header behavior on scroll
  • Scroll-triggered reveal/fade animations
  • Mobile hamburger menu open/close
  • Form validation states (error, success, focus styles)
  • Tab switching
  • Tooltip on hover

━━━ 9. ANIMATIONS & TRANSITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${animBlock || '  (no significant animations detected)'}

━━━ 10. RESPONSIVE BREAKPOINTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${responsiveBlock}

  Rules:
  • Mobile-first or desktop-first — match the original
  • Navbar must collapse into hamburger on mobile
  • Grid layouts must stack on small screens
  • Font sizes must scale appropriately

━━━ 11. ASSETS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ── Images (use EXACT URLs, do NOT change them) ──
${imageList || '  (none)'}

  ── CSS Background Images (use EXACT URLs) ──
${bgList || '  (none)'}

  ── Inline SVG icons (${images.svgCount} total) ──
${svgSamples || '  (no SVGs)'}

  ── Favicon / Icon links ──
${images.iconLinks.map(i => '  - ' + i).join('\n') || '  (none)'}

━━━ 12. EXTRACTED CSS (source truth) ━━━━━━━━━━━━━━━━━━━━━━━

  Use the CSS rules below as the ground truth for styles.
  Re-implement them cleanly inside your <style> block:

\`\`\`css
${fullCSS}
\`\`\`

━━━ 13. EXTERNAL DEPENDENCIES (reimplementation reference) ━━

  Scripts (DO NOT link — reimplement behavior in vanilla JS):
${external.scripts.map(s => '  - ' + s).join('\n') || '  (none)'}

  Stylesheets (DO NOT link — inline critical CSS):
${external.styles.map(s => '  - ' + s).join('\n') || '  (none)'}

━━━ 14. ACCESSIBILITY NOTES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${accessibilityHints.map(h => '  • ' + h).join('\n') || '  (none)'}

═══════════════════════════════════════════════════════════════
  OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════

1.  Output ONLY a single complete HTML file. No markdown, no explanation.
2.  Start with <!DOCTYPE html>, end with </html>. Nothing before or after.
3.  All CSS inside <style> in <head>. All JS inside <script> before </body>.
4.  Use the EXACT image URLs above — do not substitute with placeholders.
5.  Recreate every animation with CSS @keyframes and/or vanilla JS.
6.  Implement full responsive layout with @media queries.
7.  Reproduce every component in sections 7–8 with working interactivity.
8.  Match pixel-perfect: colors, font sizes, weights, spacing, radius, shadows.
9.  Do NOT use CDN links for Bootstrap, Tailwind, etc. Replicate manually.
10. The page must look correct in Chrome at 1440px and 375px viewport widths.
11. Include a <title>, correct <meta charset>, and <meta name="viewport">.
12. Preserve the page's original language (lang="${meta.lang}").

═══════════════════════════════════════════════════════════════
`;
  }

})();
