# App Icons

This directory contains the app icons for the Progressive Web App (PWA).

## Required Icons

For a complete PWA experience, you should provide the following icon sizes:

- **72x72** - `icon-72x72.png`
- **96x96** - `icon-96x96.png`
- **128x128** - `icon-128x128.png`
- **144x144** - `icon-144x144.png`
- **152x152** - `icon-152x152.png`
- **192x192** - `icon-192x192.png` (Android Chrome)
- **384x384** - `icon-384x384.png`
- **512x512** - `icon-512x512.png` (Android Chrome, maskable)

## iOS Splash Screens

For iOS launch screens, provide:

- **1242x2688** - `splash-1242x2688.png` (iPhone 11 Pro Max, XS Max)
- **828x1792** - `splash-828x1792.png` (iPhone 11, XR)
- **1125x2436** - `splash-1125x2436.png` (iPhone 11 Pro, X, XS)

## Shortcuts Icons

For app shortcuts:

- **192x192** - `shortcut-dashboard.png`
- **192x192** - `shortcut-copilot.png`
- **192x192** - `shortcut-new.png`

## Generating Icons

You can use online tools or scripts to generate all required sizes from a single high-resolution source image (at least 512x512 pixels):

### Using ImageMagick (Command Line)

```bash
# Install ImageMagick
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick

# Generate all sizes from source
convert source-icon.png -resize 72x72 icon-72x72.png
convert source-icon.png -resize 96x96 icon-96x96.png
convert source-icon.png -resize 128x128 icon-128x128.png
convert source-icon.png -resize 144x144 icon-144x144.png
convert source-icon.png -resize 152x152 icon-152x152.png
convert source-icon.png -resize 192x192 icon-192x192.png
convert source-icon.png -resize 384x384 icon-384x384.png
convert source-icon.png -resize 512x512 icon-512x512.png
```

### Using Online Tools

- [PWA Icon Generator](https://www.pwabuilder.com/)
- [Real Favicon Generator](https://realfavicongenerator.net/)
- [App Icon Generator](https://appicon.co/)

## Guidelines

- Use a square image with important content centered
- Ensure good contrast and visibility at small sizes
- Avoid text that might be hard to read when scaled down
- Use a transparent or solid background color
- Test icons on both light and dark backgrounds
- For maskable icons, ensure safe zone (center 80%) contains key elements

## Current Status

⚠️ **Icons Not Yet Configured**: Please add your app icons to this directory with the names listed above.
