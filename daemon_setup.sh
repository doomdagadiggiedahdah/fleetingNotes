#!/bin/bash

# Make needed directories
mkdir -p recordings/.archive transcriptions/.archive


# Check if script is run with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script with sudo privileges"
  exit 1
fi

REPO_DIR=$(pwd)
SCRIPT_PATH="$REPO_DIR/whisper_loop.sh"

echo "Setting up Whisper Loop systemd service"
echo "Script path: $SCRIPT_PATH"

# Make sure the script exists
if [ ! -f "$SCRIPT_PATH" ]; then
  echo "Error: Script not found at $SCRIPT_PATH"
  exit 1
fi

# Make the script executable
chmod +x "$SCRIPT_PATH"
echo "Looping script permissions updated"

# Create the service file
SERVICE_FILE="/etc/systemd/system/whisper-loop.service"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Whisper Loop Service
After=network.target

[Service]
Type=simple
User=mat
Group=mat
ExecStart=$SCRIPT_PATH
Restart=always

[Install]
WantedBy=default.target
EOF

echo "Service file created at $SERVICE_FILE"

# Reload systemd to recognize the new service
systemctl daemon-reload
echo "Systemd daemon reloaded"

# Enable and start the service
systemctl enable whisper-loop.service
echo "Service enabled"

systemctl start whisper-loop.service
echo "Service started"

# Check service status
echo "Service status:"
systemctl status whisper-loop.service

echo ""
echo "Setup complete! Here are some useful commands:"
echo "- Check service status: sudo systemctl status whisper-loop.service"
echo "- View logs: sudo journalctl -u whisper-loop.service"
echo "- Restart service: sudo systemctl restart whisper-loop.service"
echo "- Stop service: sudo systemctl stop whisper-loop.service"
echo "- Disable service: sudo systemctl disable whisper-loop.service"
