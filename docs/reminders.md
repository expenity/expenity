# Reminders

A website cannot wake your phone when it is closed. That is a limit of how browsers work, and Expenity does not hide it. So there are two kinds of reminder, and they work together.

## 1. Your calendar (works when Expenity is closed)

This is the reminder to rely on.

1. Open **Settings**.
2. Under Reminders, press **Download calendar file**.
3. Import the file into your calendar app.

The file holds every open bill as an all-day event, with its repeat rule and two alarms: at 09:00 on the reminder day you chose, and at 09:00 on the due day. Your calendar app then does the reminding on every device where that calendar syncs.

How to import:

- **Google Calendar** (on a computer): Settings → Import & export → Import, choose the file.
- **Apple Calendar**: open the file, or File → Import, and choose a calendar.
- **Outlook**: File → Open & Export → Import/Export → Import an iCalendar (.ics) file.

Things to know:

- The file is a snapshot. When you add or change bills, download it again. Importing again may create duplicates of events, so remove the earlier import first.
- Marking a bill paid in Expenity does not change the calendar. For a repeating bill that is fine, because the next due date is already in the repeat.
- Reminders arrive however your calendar delivers them: notification, sound or email, as you set it up there.

## 2. Notifications while Expenity is open

In **Settings → Notifications while Expenity is open**, press **Turn on** and allow notifications when your browser asks. When you open Expenity or keep it in a tab, you get one notification a day for bills that are due within their reminder window and are not snoozed.

This does not work when the app is fully closed. For that, use the calendar file.

## Choose how early

In Settings choose the **Default reminder**, from the day itself up to two weeks before. Each bill can override it in the **Remind me** field.

## Snooze

In a bill's **⋯** menu, **Snooze to tomorrow** or **Snooze 3 days** stops its notifications for a while.

## What is coming

Push notifications and email reminders when the app is closed need a small server, together with syncing between devices. They are planned; see the [roadmap](specs/06-roadmap-business.md).
