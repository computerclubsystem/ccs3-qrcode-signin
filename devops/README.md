# Create image
- Navigate to project root folder
- Build the image
```bash
docker buildx build --output=type=docker -t computerclubsystem/qrcode-signin-web-app-static-files:dev -f devops/Dockerfile .
```
