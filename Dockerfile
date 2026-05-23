FROM node:18-alpine

# Install build tools in case sqlite3 needs to compile from source
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose the correct port
EXPOSE 8083

# Start the application
CMD ["npm", "start"]
