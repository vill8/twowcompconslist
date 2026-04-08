# Google Sheets data setup

This project can now load consumables from a published Google Sheet CSV instead of `consumables.json`.

## 1) Create sheet columns

Create a sheet tab (for example: `Consumables`) with this recommended header row:

`id,name,tier,effect,duration,persists,stacks,origin,isFood,roles,classes`

Formatting rules:

- `id`: Turtle WoW item ID (numbers only). If present, links go directly to the item page.
- `persists` and `isFood`: use `true` or `false`
- `tier`, `roles`, `classes`: use comma, semicolon, or pipe separated values (for example `tier1|tier2.5|tier3`)
- `origin`: use one or multiple values (e.g. `alchemy`, `engineering`, `blasted lands buff`) separated by comma, semicolon, or pipe
- `name` is required for each row

Future-proofing notes:

- Header matching is flexible (spaces/case/punctuation are normalized)
- Supported aliases include:
  - `id`: `id`, `itemId`, `item`
  - `name`: `name`, `itemName`
  - `tier`: `tier`, `tiers`, `raidTier`
  - `effect`: `effect`, `buff`, `description`
  - `origin`: `origin`, `origins`, `source`, `sources`
  - `isFood`: `isFood`, `food`, `foodItem`
- Extra columns are safely ignored, so you can add notes/metadata later

## 2) Publish the sheet

1. Open **File -> Share -> Publish to web**
2. Choose the tab with consumables data
3. Choose **Comma-separated values (.csv)**
4. Click **Publish**

## 3) Add the URL in this project

Open `sheets-config.js` and set:

`window.CONSUMABLES_SHEET_CSV_URL = "YOUR_PUBLISHED_CSV_URL";`

If this value is empty, the app falls back to `consumables.json`.

## 4) Real-time behavior

- The app reloads sheet data every 60 seconds
- Changes in Google Sheets appear automatically in the web app
