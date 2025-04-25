# Build for Rancher with containerd: nerdctl -n buildkit build -t ccs3/qrcode-signin-web-app-static-files:latest -f Dockerfile .
FROM node:22.12.0-alpine3.21 AS build

WORKDIR /app

COPY . .

RUN npm install
RUN npm run ng -- analytics disable
RUN npm run build

FROM node:22.12.0-alpine3.21 AS final
WORKDIR /app
COPY --from=build  /app/dist/ccs3-qrcode-signin/browser .

