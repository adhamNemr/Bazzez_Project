FROM node:22-alpine

RUN apk add --no-cache python3 make g++ linux-headers eudev-dev libusb-dev

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production --ignore-scripts && \
    npm rebuild sqlite3

COPY . .

EXPOSE 8083

CMD ["node", "server.js"]
