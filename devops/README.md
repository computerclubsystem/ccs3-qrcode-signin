# Create image
- Navigate to project root folder
- Build the image
  - Using `nerdctl`:
```bash
nerdctl -n buildkit build -t ccs3/qrcode-signin-web-app-static-files:latest -f devops\Dockerfile .
```
