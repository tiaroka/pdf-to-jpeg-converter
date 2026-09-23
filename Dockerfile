# ビルドステージ: Vite 7 / pdfjs-dist 6 が要求する Node 22 以上を使う
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 配信ステージ: 非 root ユーザーで 8080 を listen する公式イメージ
FROM nginxinc/nginx-unprivileged:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
