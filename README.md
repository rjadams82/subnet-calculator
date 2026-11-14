# Subnet Calculator

A lightweight, browser-based IPv4 subnet calculator for inspecting and interactively dividing networks. It runs entirely in the browser and does not require a build step, backend, or external dependencies.

## Features

- Calculate subnet address, subnet mask, wildcard mask, broadcast IP, address ranges, usable IPs, and host counts.
- Divide and join subnets interactively.
- Quickly split a network into 8, 16, 32, or 64 equal subnets when the prefix allows it.
- Choose which result columns to display.
- Share a subnet plan with a link, or print the current plan.
- Responsive layout with a horizontally scrollable results table on small screens.

## Run

Open `htmldocs/index.html` in a modern browser, or serve the `htmldocs` directory with any static web server. No installation or build process is needed.

For example, from the repository root with Python installed:

```sh
python -m http.server 8000 --directory htmldocs
```

Then open <http://localhost:8000>.

## Use

1. Enter an IPv4 network address and prefix length (for example, `192.168.0.0` and `16`), then select **go**.
2. If the address is not on the specified network boundary, the calculator normalizes it to the network address.
3. Use a **Quick split** option to create equal-sized subnets, or use **Divide** and **Join** in the table for manual changes.
4. Use **Share subnet** to share or copy a link to the current plan. The browser's native share menu is used when available; otherwise, the link is copied to the clipboard.
5. Select **Print** to print the network summary and subnet results without the interactive controls.

The table can be scrolled horizontally on narrow screens. Its subnet-address column stays visible while scrolling.

## Project layout

```text
htmldocs/
  index.html       Calculator page and controls
  assets/
    styles.css     Responsive screen and print styles
    js/
      app.js       IPv4 calculations and interactive behavior
    img/           Subnet-division graphics
```

## Input limits

The calculator accepts dotted-decimal IPv4 addresses and prefix lengths from `/0` through `/32`. Quick splits are shown only when the requested number of divisions fits within the remaining prefix bits.
