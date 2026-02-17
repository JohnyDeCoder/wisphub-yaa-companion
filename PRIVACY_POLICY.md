# Privacy Policy — Wisphub Yaa Companion

**Last updated:** February 15, 2026

## Overview

Wisphub Yaa Companion is a browser extension designed to improve productivity on WispHub (wisphub.io and wisphub.app). This extension is intended exclusively for internal use by Yaa Internet by VW.

This policy describes what data the extension accesses, how it is stored, and how it is used.

## Data Collection

This extension collects and stores the following data **locally on your browser** using the `chrome.storage.local` API:

- **API Keys**: Provided manually by the user to authenticate with the WispHub API. These keys are stored locally and are only sent to the official WispHub API endpoints listed below.
- **User preferences**: Settings such as notification toggles, auto-format, and auto-price calculation preferences.
- **Staff info cache**: Cached staff identification data (username, name, ID) retrieved from the WispHub API to reduce redundant network requests. This cache expires automatically after 24 hours.
- **Activity logs**: Local logs of extension actions (formatting, price calculations, etc.) stored only in your browser. A maximum of 50 log entries are retained.
- **Connection state cache**: A short-lived cache (30 seconds) of the last connection check result to avoid redundant pings.

**No personal data is collected beyond what is described above. No analytics, telemetry, or tracking of any kind is performed.**

## Data Usage

- All data is stored **locally** in your browser and is **never transmitted to external servers** other than the official WispHub API.
- API Keys are used **exclusively** to communicate with the official WispHub API (`api.wisphub.io` and `api.wisphub.app`).
- The extension reads and modifies text content within the CKEditor on WispHub pages to provide formatting, price calculation, and template features.
- Staff data retrieved from the API is used solely to display staff identification in the extension popup and to auto-fill form fields on WispHub pages.

## Data Sharing

This extension does **not**:

- Sell, transfer, or share any user data with third parties.
- Use data for purposes unrelated to the extension's core functionality.
- Transmit data to any server other than the official WispHub API.
- Use remote code execution or dynamically load external scripts.

## Data Retention

- **User preferences** are stored indefinitely until the user clears browser data or uninstalls the extension.
- **Staff info cache** expires automatically after 24 hours.
- **Activity logs** are limited to the 50 most recent entries and can be manually cleared by the user from the extension popup.
- **All stored data** is removed automatically when the extension is uninstalled.

## Permissions

| Permission                                   | Purpose                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `storage`                                    | Save user preferences, API keys, and cached data locally in the browser   |
| `host_permissions` (wisphub.io, wisphub.app) | Run content scripts on WispHub pages and communicate with the WispHub API |

This extension does **not** request the `activeTab`, `tabs`, `scripting`, or any other broad permissions. Content scripts are declared in the manifest and run only on `wisphub.io` and `wisphub.app` domains.

## Network Requests

The only network requests made by this extension are to:

- `https://api.wisphub.io/api/` — WispHub API for staff info and ticket/installation management
- `https://api.wisphub.app/api/` — WispHub API for staff info and ticket/installation management

Additionally, the extension may make requests to WispHub page URLs (e.g., `wisphub.io/editar-cliente/...`) using the user's existing session cookies to update installation statuses via web forms.

**No other external services, analytics providers, or third-party APIs are contacted.**

## User Rights

You may at any time:

- **View** all stored data via the extension popup (Settings and Logs sections).
- **Delete** stored API keys by clearing the input fields and saving.
- **Clear** activity logs using the "Limpiar" button in the Logs viewer.
- **Remove** all extension data by uninstalling the extension from your browser.

## Contact

For questions about this privacy policy, contact: **johny.m@yaainternet.com**

## Changes

Any changes to this privacy policy will be reflected in this document with an updated date at the top.
