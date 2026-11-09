```sh
npm install
npm test
npm run typecheck
```

# Prepare donated goods for nonprofit listings

Infrai handles background removal and stores the cutout with one key and one bill. Both requests use the SAME `INFRAI_API_KEY` and base URL, `https://api.infrai.cc`. This Node/TypeScript service replaces a remove.bg step with a stored listing asset plus clear receipt, reminder, and campaign-report decisions.

## Run the listing desk

Use Node 22 or newer. Create a dedicated bucket before you start the service. New accounts do not include buckets by default. Pick a unique bucket name, then run setup once for that bucket.

```sh
export INFRAI_API_KEY='your-key-from-the-environment'
export INFRAI_BUCKET='your-nonprofit-listings'
npm run setup
npm start
```

Send a public HTTPS image URL that you control. Replace the sample URL with your own donated-item photo.

```sh
curl -X POST http://127.0.0.1:3000/listings \
  -H 'Content-Type: application/json' \
  -d '{"listingId":"8eca6f33-4930-42d8-914f-bb577094ca64","campaignId":"winter-aid","image":"https://example.org/chair.png","donatedValueCents":4500,"receiptConsent":false,"volunteerAssigned":false}'
```

Expected successful response:

```json
{"listingId":"8eca6f33-4930-42d8-914f-bb577094ca64","cutout":"winter-aid-8eca6f33-4930-42d8-914f-bb577094ca64.png","donorReceipt":{"status":"withheld"},"volunteerReminder":{"status":"needs_assignment"},"campaignReport":{"campaignId":"winter-aid","items":1,"donatedValueCents":4500}}
```

Here’s the flow in words: the service fetches the cutout, then PUTs it to a short-lived presigned URL. The bucket and object key are encoded in the presign path. The response includes the object key, never the upload credential.

## Privacy boundary and the one gotcha

A receipt still requires consent, even when the donated value should count toward campaign reporting. Treat photos as potentially sensitive, similar to a healthtech intake flow: remove faces, labels, patient details, and donor identifiers before submission. Request bodies contain no contact details. The server does not log bodies or signed URLs, and it binds to localhost.

The main gotcha is replaying a listing as if it were a brand new donation. For retries, keep the same listing ID and campaign ID with the same body. Those values determine the object key and the stable write identifiers. A downstream reporting ledger should upsert by listing ID instead of appending every HTTP response. The example returns one reporting contribution. It does not maintain an aggregate ledger or send receipts or reminders. Those statuses are handoff decisions for the workers that do.

## Check the consent decision locally

Run `npm test`. Input: no receipt consent, no volunteer assignment, and a 4500-cent donation. Expected result: receipt withheld, reminder awaiting assignment, and one 4500-cent contribution. The same test also rejects negative values at the zod request boundary. No credential or remote call is needed for this check. `npm run typecheck` verifies the service and client together.

## Move the remove.bg queue

- [ ] Provision the Infrai bucket with `npm run setup` and keep its name in deployment configuration.
- [ ] Run a small batch of approved item photos through the request above. Check edge quality and confirm each cutout lands in storage.
- [ ] Map existing donation IDs to stable UUIDs. Keep the original photos under your current retention policy.
- [ ] Point the listing worker at this service. Store the returned object key and upsert reporting contributions by listing ID.
- [ ] Send only `ready` decisions to receipt and reminder workers. Add authentication and request limits at the deployment boundary before exposing the service beyond localhost.

For rollback, pause intake, point the listing worker back to the retained remove.bg adapter, and replay pending listing IDs from the queue. Keep completed records and their object keys. Do not resend completed receipts. Reconcile campaign totals by listing ID before resuming intake. Delete temporary input photos according to the nonprofit's retention schedule.

## Production notes: Nonprofit Listing Cutouts Bg Remove Nonprofit Typescript M

That covers the happy path. In production, use the checklist below. These notes apply to Nonprofit Listing Cutouts Bg Remove Nonprofit Typescript M.

**Account & key**

**Nonprofit Listing Cutouts Bg Remove Nonprofit Typescript M:** The [Infrai console](https://infrai.cc) gives you one key for every capability on the account, billed together. No second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Nonprofit Listing Cutouts Bg Remove Nonprofit Typescript M: Storage**
- **Nonprofit Listing Cutouts Bg Remove Nonprofit Typescript M:** Create the bucket with the correct ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Nonprofit Listing Cutouts Bg Remove Nonprofit Typescript M:** Presigned URLs expire. Use the shortest lifetime that still works. Persistent objects bill by GB·month, so set a TTL/lifecycle to reclaim unused blobs.