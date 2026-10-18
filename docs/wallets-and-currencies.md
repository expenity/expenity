# Wallets and currencies

A wallet is a place where money is: cash, a bank account, a card, a savings account. Every transaction belongs to a wallet, and a wallet's balance is its opening balance plus income, minus expenses, with transfers in and out.

![Your wallets.](images/wallets.png)

## Add and edit wallets

Open **More → Wallets**, or tap a wallet on Home. Each wallet has a name, a type (cash, bank account, card, savings, other), a currency and an **opening balance**, which is what was in it when you started. You can archive a wallet to hide it. A wallet that already has transactions is archived instead of deleted, so history is never lost.

## Your main currency

You choose a **main currency** in the setup, and can change it in **More → Reminders and calendar → Main currency**. Totals on Home and in Reports are shown in it.

## Wallets in other currencies

A wallet can use any currency. A bill or transaction takes the currency of its wallet. When your wallets use several currencies, totals are converted to your main currency using daily exchange rates, and shown with **≈** to say they are approximate. Expenity never adds different currencies together as plain numbers.

Rates are the European Central Bank reference rates, fetched through the Expenity API once a day. Only the public rates are requested: nothing about you is sent. If rates cannot be loaded, other currencies are listed on their own lines instead of being converted.

## Transfers

To move money between wallets, press **+** and choose **Transfer**. If the two wallets use different currencies, you also enter the amount received. Transfers are not counted as income or expenses.

## Money set aside for goals

When you add money to a [goal](budgets-goals-income.md#goals), it is taken from a wallet you choose, so the wallet balance drops. That money is not counted as spending in your reports or budgets.

## Wallet colors

Every wallet has a color. By default it follows your theme: the first wallet uses the theme's accent color and the others step around the color wheel from it, so they change when you change the theme. To choose your own, open **More → Wallets**, pick a wallet and choose a color (or **Theme color** to go back to the default, or the **+** swatch for any color you like).
