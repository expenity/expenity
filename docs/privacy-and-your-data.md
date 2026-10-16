# Privacy and your data

## What is stored, and where

**On your device.** Expenity saves financial records in your browser first, so it works offline. Without an account, that is the only place your data lives.

**On Expenity's server, if you create an account.** To sync between your devices, your email address and your data (wallets, transactions, bills, budgets, goals, categories, recurring income and some settings) are stored on a Cloudflare Worker and database (D1). The connection is encrypted, and access needs your passkey. Expenity does not look at your data, sell it, share it or use it for advertising. As with most online services, it is not end-to-end encrypted.

**Notifications.** If you turn on notifications when the app is closed, the server keeps the address your browser gives it for sending them, your time zone and the hour you chose, and looks at which of your bills are due to build the daily summary. Turning them off removes it.

**Passkeys.** The server stores only the public part of each passkey. Recovery codes are stored hashed.

**Shared wallets.** If you share a wallet, the people you invite can see that wallet's transactions and each other's email address. Nothing else of yours.

**Exchange rates.** The app asks the Expenity server for public currency rates once a day. No personal data is sent with that request.

**Analytics.** The website and the app count visits anonymously with Cloudflare Web Analytics: no cookies, no personal data, never the contents of your wallets.

**Bank details.** Expenity never asks for bank details, never connects to a bank and never moves money. A payment link on a bill just opens the page you saved.

## Back up and restore

Even with an account, you can keep your own copy. In **More → Data and backup**:

- **Download backup (JSON)** saves your wallets, transactions, bills, budgets, goals and income schedules.
- **Restore a backup** reads such a file and replaces the current data after you confirm. This is also how you move data from the guest mode of one browser to another.
- **Transactions as CSV** exports your history for a spreadsheet.

Without an account, clearing the site's data (or losing the device) removes your data, so back up regularly.

## Delete everything

- **Delete all my data** (More → Data and backup) removes everything from this browser. If you are signed in, your data comes back from your account at the next sync, so it only clears this device.
- **Delete my account** (More → Account and sync) deletes your account and everything stored on the server. It asks for your passkey and cannot be undone. Wallets you own and share are deleted for everyone.

## Notifications while the app is open

The in-app option shows them locally. Nothing is sent anywhere.

## The calendar file

The calendar file you download contains your bill names, amounts and notes. When you import it into Google, Apple or Outlook calendar, it is stored by that service under its own privacy rules. Avoid sensitive details in notes if that matters to you.

## Open source

The app and the server are public, so you can check all of this: [github.com/expenity/expenity](https://github.com/expenity/expenity).

## Photos and saved names

Saved names are optional account settings and sync with your financial data. Photos are compressed separately, stored in D1, and never cached by the app for offline viewing. They follow current wallet access. Delete your uploads in Account; other members’ uploads remain. JSON backups contain image references rather than the files.
