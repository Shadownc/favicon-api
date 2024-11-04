const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// 根路径，返回 API 状态
app.get('/', async (req, res) => {
    res.json({
        status: "API is running"
    });
});

// 通用路由，通过查询参数传递 URL 获取 favicon
app.get('/favicon', async (req, res) => {
    try {
        const targetUrl = req.query.url;

        if (!targetUrl) {
            return res.status(400).send('URL parameter is required');
        }

        // 从目标 URL 中提取域名
        const domain = new URL(targetUrl).hostname;

        // 重定向到 /favicon/:domain.png
        res.redirect(307, `/favicon/${domain}.png`);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error processing request');
    }
});

// 处理带有域名的 favicon 路由，例如 /favicon/example.com.png
app.get('/favicon/:domain', async (req, res) => {
    try {
        // 从请求参数中获取域名
        const domain = req.params.domain.replace('.png', '');
        const targetUrl = `https://${domain}`;

        // 1. 首先尝试直接访问 /favicon.ico
        try {
            const faviconUrl = `${targetUrl}/favicon.ico`;
            const response = await axios.get(faviconUrl, { responseType: 'arraybuffer' });

            if (response.status === 200) {
                res.setHeader('Content-Type', 'image/x-icon');
                return res.send(response.data);
            }
        } catch (error) {
            // 如果直接访问 /favicon.ico 失败，继续尝试其他方法
        }

        // 2. 获取页面 HTML 并解析 link 标签中的 favicon
        const pageResponse = await axios.get(targetUrl);
        const $ = cheerio.load(pageResponse.data);

        // 查找 favicon 的 link 标签
        const faviconLink = $('link[rel="icon"]').attr('href') ||
                            $('link[rel="shortcut icon"]').attr('href') ||
                            $('link[rel="apple-touch-icon"]').attr('href');

        if (!faviconLink) {
            return res.status(404).send('Favicon not found');
        }

        // 处理相对路径
        const absoluteFaviconUrl = new URL(faviconLink, targetUrl).href;

        // 获取 favicon 图标
        const faviconResponse = await axios.get(absoluteFaviconUrl, { responseType: 'arraybuffer' });

        // 设置正确的 Content-Type
        const contentType = faviconResponse.headers['content-type'];
        res.setHeader('Content-Type', contentType || 'image/x-icon');

        // 返回 favicon 图像数据
        res.send(faviconResponse.data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error fetching favicon');
    }
});

// 本地运行时监听端口
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// Vercel 需要导出 handler
module.exports = app;
