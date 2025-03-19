#!/bin/bash

# Print our existential message
echo "Packaging the extension into a meaningless zip file..."

# Remove any existing zip file and dist directory
rm -rf dist
mkdir -p dist

# Create the zip file from the root directory
zip -r dist/autoji.zip manifest.json background.js popup.html popup.js icons/

echo "Extension packaged into dist/autoji.zip"
echo "Now you can upload it to Chrome Web Store and watch it disappear into the void..."

# Instructions for manual .crx creation
echo """
To create a .crx file (if you really must):
1. Open Chrome and go to chrome://extensions
2. Enable Developer mode (top right)
3. Click 'Pack extension'
4. Select the current directory
5. Click 'Pack Extension'
6. Question your life choices
""" 