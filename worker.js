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
    console.error(`Fetch error for ${url}:`, error);
    throw error;
  }
}

// 尝试获取图标的所有可能路径
async function tryGetFavicon(domain) {
  const targetUrl = `https://${domain}`;
  const commonPaths = [
    '/favicon.ico',
    '/favicon.png',
    '/assets/favicon.ico',
    '/static/favicon.ico',
    '/public/favicon.ico'
  ];

  for (const path of commonPaths) {
    try {
      const response = await fetchWithTimeout(`${targetUrl}${path}`, {}, 3000);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const data = await response.arrayBuffer();
        return { success: true, data, contentType };
      }
    } catch (error) {
      console.warn(`Failed to fetch favicon from ${path}:`, error);
    }
  }
  return null;
}

// 使用Google S2 Favicon API作为优先方案
function getFaviconFromGoogle(domain) {
  return `https://www.google.com/s2/favicons?sz=64&domain_url=${domain}`;
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
      
      // 1. 优先使用 Google S2 Favicon API
      const googleFaviconUrl = getFaviconFromGoogle(domain);
      const googleFaviconResponse = await fetchWithTimeout(googleFaviconUrl, {}, 3000);
      if (googleFaviconResponse.ok) {
        const contentType = googleFaviconResponse.headers.get('content-type');
        const data = await googleFaviconResponse.arrayBuffer();
        
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

      // 2. 如果Google S2 Favicon API失败，尝试常见的 favicon 路径
      const directResult = await tryGetFavicon(domain);
      if (directResult && directResult.success) {
        faviconCache.set(domain, directResult);
        return new Response(directResult.data, {
          headers: { 
            'Content-Type': directResult.contentType || 'image/x-icon',
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // 3. 返回 404 如果没有找到
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
