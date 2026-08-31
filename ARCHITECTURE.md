# Serverless architecture

This backend uses Firebase Functions (2nd generation) and Cloud Firestore.
Every function runs in `us-central1`, which is compatible with the configured
multi-region Firestore database (`nam5`).

## Public API

The following callable functions are the only write boundary for the client:

- `createPerson` — administrators and treasurers
- `createLot` — administrators
- `registerVehicle` — administrators and treasurers
- `registerPayment` — administrators and treasurers
- `deactivateVehicle` — administrators and treasurers
- `assignResidentToLot`, `deactivatePerson`, and `voidPayment` — administrators

Callable Functions validate Firebase Authentication automatically. Each user
must have a custom `role` claim: `admin`, `treasurer`, or `resident`.
`setUserRole` and `setActiveRate` are administrator-only functions.

Firestore rules reject every client write. Staff can read all operational data;
residents can read only records linked to their `people.authUid`. The Admin SDK
used by Functions is deliberately the sole writer. Each `authUid` can be linked
to only one person, preserving this ownership boundary.

## Background work

Cloud Scheduler invokes two idempotent scheduled functions in the Guatemala
time zone:

- `generateMonthlyInvoices`, at midnight on the first day of the month.
- `applyOverdueFees`, daily at 00:15.

Payment creation, its invoice applications, invoice balance updates, and
resident validation happen inside one Firestore transaction. A client cannot
create an application that would overpay an invoice or apply an invoice
belonging to another person. Vehicle owners and a lot's current resident are
also validated against the `people` collection before they are linked.

The overdue-fee job re-reads each candidate invoice in a transaction before
changing it. This makes it safe to run alongside payment registration and safe
to retry: a fee is applied at most once. Monthly invoice IDs are deterministic
(`{personId}_{YYYY-MM}`) and the generator de-duplicates residents assigned to
more than one active lot before creating documents.

Every callable validates an explicit schema: unknown fields, malformed nested
objects, invalid Firestore IDs, unsafe monetary values, and over-sized text are
rejected with `invalid-argument`. Lifecycle operations are append-only where
financial history matters: payments are never deleted, only voided while their
invoice applications are restored in the same transaction. A resident must be
unassigned before deactivation; reassignment updates the old lot, new lot, and
both resident links atomically.

## Module boundaries

Each feature lives in `functions/src/modules/<module>/`. Callable and scheduled
handlers in `http/` validate authorization and schemas only; `application/`
coordinates workflows and transactions; `domain/` owns document construction
and financial state transitions; and `infrastructure/` owns Firestore access.
The small `admin` module has only an HTTP handler because it delegates directly
to Firebase Auth and does not need artificial empty layers. Shared Firebase
helpers and validation remain in `functions/src/shared`.

The invoice domain model is the single source for applying and reversing
payments and for late fees. New invoices snapshot `rateId` and `lateFeeCents`,
so later rate changes do not rewrite historical obligations.

Creating a person never assigns `lotId`; only
`assignResidentToLot` can establish, move, or remove that relationship.

Scheduled handlers only declare their schedules and invoke their application
use cases. Semantic repositories expose active rates/lots, overdue invoices,
deterministic monthly invoice references, and chunked invoice creation.

## Collection naming

Use English collection and field names: `people`, `lots`, `vehicles`,
`invoices`, `payments`, and `rates`. Monetary fields use integer cents (for
example, `residentMonthlyAmountCents`) rather than decimal floating-point
numbers. A rate document is created through `setActiveRate`; it atomically
deactivates the earlier rate before activating the new one.

## Deployment

1. Create the first administrator with the `bootstrap:admin` script. It uses
   Application Default Credentials or `GOOGLE_APPLICATION_CREDENTIALS` and the
   `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` environment variables.
2. Sign in with that account, refresh its ID token, and use `setUserRole` to
   grant access to further users.
3. Deploy authentication, rules, indexes, and functions: `firebase deploy`.
4. The required `invoices` index is already declared in
   `firestore.indexes.json` and is deployed with the Firebase configuration.

## Local verification

Run `npm test` and `npm run lint` inside `functions`. Start the local stack
with `firebase emulators:start --only auth,firestore,functions`; the Emulator
Suite UI runs at `http://127.0.0.1:4001`.

## Migration note

The previous Spanish collection names and fields are intentionally not read by
this version. Run `npm run migrate:legacy` for a non-writing inventory. Once a
backup is confirmed, run `npm run migrate:legacy -- --execute`. The migration
defaults to treating legacy currency values as decimal units; set
`LEGACY_AMOUNT_MODE=cents` only when the old data was already stored in cents.
It never overwrites an English document, so resolve any reported duplicate
document IDs before retrying.

The scheduling functions require the Firebase project to be on the Blaze plan.
