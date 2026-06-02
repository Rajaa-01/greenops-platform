FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM alpine:latest
RUN apk add --no-cache dumb-init
WORKDIR /app
COPY --from=builder /app/build ./build
USER 1000:1000
CMD ["dumb-init", "tail", "-f", "/dev/null"]
