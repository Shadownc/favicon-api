// 创建缓存对象
const faviconCache = new Map();

// 设置超时的 fetch 函数
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// 针对特定网站的处理规则
const specialDomains = {
  'blog.csdn.net': {
    directUrl: 'https://g.csdnimg.cn/static/logo/favicon32.ico',
    timeout: 3000
  },
  // 可以添加其他特殊网站的规则
};

// 尝试获取图标的所有可能路径
async function tryGetFavicon(domain) {
  // 检查是否是特殊域名
  const specialDomain = specialDomains[domain];
  if (specialDomain) {
    try {
      const response = await fetchWithTimeout(
        specialDomain.directUrl, 
        {}, 
        specialDomain.timeout
      );
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const data = await response.arrayBuffer();
        return { success: true, data, contentType };
      }
    } catch (error) {
      console.warn(`Special domain fetch failed for ${domain}:`, error);
    }
  }

  const targetUrl = `https://${domain}`;
  const commonPaths = [
    '/favicon.ico',
    '/favicon.png',
    '/assets/favicon.ico',
    '/static/favicon.ico',
    '/public/favicon.ico'
  ];

  // 并发请求所有可能的 favicon 路径
  const promises = commonPaths.map(path => 
    fetchWithTimeout(`${targetUrl}${path}`, {}, 3000)
      .then(async response => {
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          const data = await response.arrayBuffer();
          return { success: true, data, contentType };
        }
        return { success: false };
      })
      .catch(() => ({ success: false }))
  );

  // 等待第一个成功的结果或全部失败
  const results = await Promise.race([
    Promise.all(promises),
    new Promise(resolve => setTimeout(() => resolve([]), 4000))
  ]);
  
  const successResult = results.find(result => result.success);
  if (successResult) {
    return successResult;
  }
  return null;
}

// 从 HTML 中快速提取 favicon URL
function extractFaviconUrl(html, baseUrl) {
  const patterns = [
    /<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon)["']/i,
    /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      try {
        return new URL(match[1], baseUrl).href;
      } catch (e) {
        continue;
      }
    }
  }
  return null;
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 根路径，返回 API 状态
  if (path === '/') {
    return new Response(JSON.stringify({ status: "API is running" }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 处理 /favicon 路由
  if (path === '/favicon') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response('URL parameter is required', { status: 400 });
    }
    
    try {
      const domain = new URL(targetUrl).hostname;
      return Response.redirect(`${url.origin}/favicon/${domain}.png`, 307);
    } catch (error) {
      return new Response('Error processing request', { status: 500 });
    }
  }
  
  // 处理 /favicon/:domain 路由
  if (path.startsWith('/favicon/')) {
    try {
      const domain = path.split('/favicon/')[1].replace('.png', '');
      
      // 检查缓存
      if (faviconCache.has(domain)) {
        const cachedData = faviconCache.get(domain);
        return new Response(cachedData.data, {
          headers: { 
            'Content-Type': cachedData.contentType,
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // 1. 首先尝试常见的 favicon 路径
      const directResult = await tryGetFavicon(domain);
      if (directResult) {
        faviconCache.set(domain, directResult);
        return new Response(directResult.data, {
          headers: { 
            'Content-Type': directResult.contentType || 'image/x-icon',
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // 如果是特殊域名但没有获取到图标，直接返回 404
      if (specialDomains[domain]) {
        return new Response('Favicon not found', { status: 404 });
      }
      
      // 2. 如果直接路径都失败，尝试解析 HTML
      try {
        const targetUrl = `https://${domain}`;
        const pageResponse = await fetchWithTimeout(targetUrl, {}, 4000);
        const html = await pageResponse.text();
        const faviconUrl = extractFaviconUrl(html, targetUrl);
        
        if (faviconUrl) {
          const faviconResponse = await fetchWithTimeout(faviconUrl, {}, 3000);
          if (faviconResponse.ok) {
            const contentType = faviconResponse.headers.get('content-type');
            const data = await faviconResponse.arrayBuffer();
            
            faviconCache.set(domain, {
              data,
              contentType: contentType || 'image/x-icon'
            });
            
            return new Response(data, {
              headers: { 
                'Content-Type': contentType || 'image/x-icon',
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
        }
      } catch (error) {
        console.warn('HTML parsing error:', error);
      }
      
      return new Response('Favicon not found', { status: 404 });
      
    } catch (error) {
      console.error('Request processing error:', error);
      return new Response('Error processing request', { status: 500 });
    }
  }
  
  return new Response('Not Found', { status: 404 });
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});