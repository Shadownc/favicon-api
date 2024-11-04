# Favicon 获取 API

这是一个基于 Node.js 和 Express 的 API，用于获取指定 URL 的 Favicon 图标。此 API 可以方便地部署到 Vercel，提供无服务器的高效体验，并且使用内存缓存来加速重复请求的处理。

## Cloudflare版本
[workers.md](./workers.md)

## 功能特色

- 获取指定 URL 的 Favicon。
- 使用内存缓存加速重复请求。
- 支持 `/favicon?url=...` 和 `/favicon/:domain.png` 两种端点。
- 使用 Express 和 Axios 开发，易于维护和使用。

## API 端点

### 1. 检查 API 状态

**GET /**

返回当前 API 的状态。

**示例响应：**
```json
{
    "status": "API is running"
}
```

### 2. 通过 URL 参数获取 Favicon

**GET /favicon**

通过 `url` 查询参数获取指定 URL 的 Favicon。

**示例：**
```
/favicon?url=https://www.example.com
```
请求将自动重定向到 `/favicon/example.com.png`。

### 3. 通过域名路径获取 Favicon

**GET /favicon/:domain**

通过给定域名获取 Favicon。

**示例：**
```
/favicon/example.com.png
```

## 一键部署到 Vercel

你可以通过以下按钮一键将此项目部署到 Vercel：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/Shadownc/favicon-api)


### 本地运行

按照以下步骤在本地运行该项目：

1. **克隆仓库：**
   ```sh
   git https://github.com/Shadownc/favicon-api.git
   cd favicon-api
   ```
2. **安装依赖：**
   ```sh
   npm install
   ```
3. **启动服务器：**
   ```sh
   npm dev
   ```
4. **访问 API：**
   在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

### 示例请求

要获取 `https://www.google.com` 的 Favicon，可以使用以下端点：
```
GET /favicon?url=https://www.google.com
```

### 使用 CURL 示例

```sh
curl "http://localhost:3000/favicon?url=https://www.google.com"
```

## 使用的技术

- **Express.js**: Node.js 的 Web 框架。
- **Axios**: 用于发送 HTTP 请求以获取 Favicon 图标。
- **Cheerio**: 用于解析 HTML 内容并提取 Favicon 链接。

## 工作原理

1. `/favicon` 端点接收一个 URL 并提取域名以找到其 Favicon。
2. 首先尝试直接访问 `https://domain.com/favicon.ico`。
3. 如果访问失败，则加载该 URL 的 HTML 并搜索 `<link>` 标签来找到 Favicon 的路径。
4. 将结果缓存起来，以提高后续请求的响应速度。

## 贡献

如果你希望改进代码或添加新功能，欢迎提交 Pull Request。在提交之前，请确保你的代码通过现有测试，并提供新的测试用例。

## 许可协议

该项目是开源的，并可根据 [MIT 许可协议](LICENSE) 使用。
