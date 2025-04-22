# Environment Switcher Chrome Extension

A Chrome extension that helps you quickly switch between different environments (development, staging, production) of your web applications.

## Features

- 🚀 Quick environment switching with a floating widget
- 🎨 Modern, clean UI with customizable appearance
- 🔄 Real-time URL comparison between environments
- 📌 Save and manage multiple environments
- 🎯 Smart environment detection
- 🎭 Toggle widget visibility
- 📱 Responsive design

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/masoudtahsiri/env-switcher.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the cloned repository directory

## Usage

### Adding Environments

1. Click the extension icon in your browser toolbar
2. Click "Manage Environments"
3. Fill in the environment details:
   - Name (e.g., "Production", "Staging")
   - URL (e.g., "https://example.com")
   - Group (optional, for organizing environments)

### Using the Floating Widget

- The widget appears as a circular button in the bottom-right corner
- Click to open the environment switcher menu
- Select an environment to switch to it
- Drag the widget to reposition it
- Click the red close button to hide the widget

### Comparing Environments

1. Click the extension icon
2. Select two environments to compare
3. Click "Compare" to see the differences

## Configuration

### Widget Appearance

The widget can be customized through the following CSS variables:

```css
--widget-bg-color: #333333;  /* Widget background color */
--widget-hover-color: #444444;  /* Widget hover color */
--icon-color: #ffffff;  /* Icon color */
--close-button-color: #E53935;  /* Close button color */
```

### Environment Detection

The extension automatically detects the current environment based on the URL. It matches:
- Exact URL matches
- Domain matches
- Subdomain matches

## Development

### Project Structure

```
env-switcher/
├── content-scripts/     # Content scripts for the floating widget
├── popup/              # Popup interface
│   ├── js/             # JavaScript files
│   ├── css/            # CSS files
│   └── html/           # HTML files
├── background.js       # Background script
└── manifest.json       # Extension manifest
```

### Building

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/masoudtahsiri/env-switcher/issues) on GitHub. 