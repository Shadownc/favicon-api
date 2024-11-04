# Favicon 获取服务 Worker

此 Cloudflare Worker 可以通过访问常见的 favicon 路径或解析目标网站的 HTML 来获取指定网站的 favicon。它还包含缓存机制，以便在后续请求时更快响应。

## 功能

- **超时控制的 Fetch**：确保 fetch 请求在超过指定超时限制时自动中止。
- **特殊域名处理**：允许为特定域名直接提供 favicon URL。
- **多路径搜索**：并行尝试从多个常见路径获取 favicon。
- **HTML 解析作为备选方案**：如果常用路径获取失败，Worker 将尝试解析 HTML 找到 favicon 链接。
- **缓存**：将已获取的 favicon 存储在内存中，以提高性能并减少对同一域的重复请求。

## API 端点

### `GET /`
- **描述**：返回 API 的状态。
- **响应**：`{ "status": "API is running" }`

### `GET /favicon?url=<URL>`
- **描述**：重定向到缓存或已获取的 favicon。
- **查询参数**：
  - `url`：目标网站的 URL。
- **响应**：307 重定向到 Worker 内相应的 favicon 路径。

### `GET /favicon/<domain>.png`
- **描述**：尝试获取并返回指定域名的 favicon 图标。
- **路径参数**：
  - `<domain>`：目标网站的域名。
- **响应**：返回 `.png` 格式的 favicon 图标，或返回 404 如果未找到。

## 代码结构

### 核心功能

- **fetchWithTimeout**：以指定超时时间 fetch 某个 URL，如果超时则中止请求。
- **tryGetFavicon**：尝试从常用路径和预定义的特殊域名中获取 favicon。
- **extractFaviconUrl**：解析 HTML 内容以寻找 favicon 链接。
- **handleRequest**：主请求处理器，根据请求路径和参数提供相应的响应。

### 缓存

`faviconCache` Map 对象用于缓存每个域的 favicon，以提高性能并减少重复请求。

## 特殊域名处理

某些域名的 favicon URL 不在常用路径上。Worker 可以通过在 `specialDomains` 对象中查找这些特定域名的 favicon URL。

## 使用示例

要获取 `https://example.com` 的 favicon，可以访问以下 URL：

`https://your-worker-url/favicon?url=https://example.com`


或者，您也可以直接使用以下路径获取缓存的 favicon：

`https://your-worker-url/favicon/example.com.png`


## 部署

1. **安装 Cloudflare CLI**：`npm install -g @cloudflare/wrangler`
2. **登录到 Cloudflare**：`wrangler login`
3. **发布 Worker**：
```
wrangler deploy
```

## 错误处理

- **400 Bad Request**：在缺少必要参数时返回。
- **404 Not Found**：在未找到请求域的 favicon 时返回。
- **500 Internal Server Error**：在处理请求时发生意外错误时返回。

## 许可协议

该项目是开源的，并可根据 [MIT 许可协议](LICENSE) 使用。

