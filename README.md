# Env Switcher Chrome Extension

A Chrome extension that allows you to switch between different environments (e.g., staging, production) and compare them side by side.

## Features

- **Environment Switching**: Easily switch between different environments while preserving the current path and query parameters
- **Side-by-Side Comparison**: Compare two environments simultaneously to spot differences
- **DOM Comparison**: Automatically detect and highlight differences in the DOM structure
- **Modern UI**: Clean and intuitive interface with color-coded environments
- **Customizable**: Add your own environments with custom names and colors

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Usage

### Environment Switching

1. Click the extension icon in your Chrome toolbar
2. Select the target environment from the dropdown
3. Click "Switch" to navigate to the same page in the selected environment

### Adding Environments

1. Click the extension icon
2. Enter the environment details:
   - Name (e.g., "Production", "Staging")
   - Base URL (e.g., "https://example.com")
   - Color (optional)
3. Click "Add Environment"

### Comparing Environments

1. Click the extension icon
2. Click the "Compare" button
3. The comparison tool will open in a new tab
4. Click "Compare" to analyze differences
5. Click "Highlight Differences" to toggle the visual highlighting
6. Click on any difference in the list to scroll to it

## Default Environments

The extension comes with two default environments:

- **Production**: https://credaily.com/
- **Staging**: https://cre2stg.wpengine.com/

## Development

The extension is built using vanilla JavaScript and modern CSS. The main components are:

- `popup/`: Contains the popup interface files
- `comparison/`: Contains the comparison tool files
- `css/`: Contains stylesheets
- `js/`: Contains JavaScript modules
- `icons/`: Contains extension icons

## License

MIT License 