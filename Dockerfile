# Place this in the ROOT of your backend repo as "Dockerfile"
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 4000
# Adjust this to wherever your server's entry point actually is
CMD ["node", "src/index.js"]
