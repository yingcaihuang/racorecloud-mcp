FROM node:24-alpine
WORKDIR /app

# 先拷贝依赖清单，利用 Docker 层缓存
COPY package*.json ./
RUN npm ci --omit=dev

# 再拷贝源码
COPY . .

EXPOSE 3000

# 远程 HTTP 模式（多租户），非 stdio 的 index.mjs
CMD ["node", "http-server.mjs"]
