const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// favicon 存储目录（可选）
// const FAVICON_DIR = path.join(__dirname, 'public', 'favicon');

// 确保 favicon 目录存在
// async function ensureDirectory() {
//     try {
//         await fs.mkdir(FAVICON_DIR, { recursive: true });
//     } catch (error) {
//         console.error('Error creating directory:', error);
//     }
// }

// ensureDirectory();

// 获取 favicon 的路由
app.get('/favicon', async (req, res) => {
    try {
        const targetUrl = req.query.url;

        if (!targetUrl) {
            return res.status(400).send('URL parameter is required');
        }

        // 从 URL 中提取域名
        const domain = new URL(targetUrl).hostname;
        const faviconPath = `/favicon/${domain}.png`;

        // 重定向到新的 URL
        res.redirect(307, faviconPath);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error processing request');
    }
});

// 处理带有域名的 favicon 路由
app.get('/favicon/:domain', async (req, res) => {
    try {
        const domain = req.params.domain.replace('.png', '');
        const targetUrl = `https://${domain}`;

        // 1. 首先尝试直接访问/favicon.ico
        try {
            const faviconUrl = `${targetUrl}/favicon.ico`;
            const response = await axios.get(faviconUrl, { responseType: 'arraybuffer' });

            if (response.status === 200) {
                res.setHeader('Content-Type', 'image/x-icon');
                return res.send(response.data);
            }
        } catch (error) {
            // 如果直接访问 favicon.ico 失败，继续尝试其他方法
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
        
        // 获取 favicon
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

// 本地运行时
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// Vercel 需要导出 handler
module.exports = app;
