# Create image
- Navigate to project root folder
- Build the image
```bash
docker buildx build --load -t computerclubsystem/qrcode-signin-web-app-static-files:dev -f devops/Dockerfile .
```
