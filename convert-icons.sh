#!/bin/bash

# Create icons directory if it doesn't exist
mkdir -p icons

# Convert SVG to PNG in different sizes
for size in 16 48 128; do
  rsvg-convert -w $size -h $size icons/icon.svg > icons/icon${size}.png
done 