# PlotLab Studio

PlotLab Studio is the private command centre for the PlotLab ecosystem. It is deployed separately from the public PlotLab website and connects to the existing Firebase project `plotlab-22f4b`.

## Included workspaces

- **Overview** — Studio summary and shortcuts.
- **Administration** — live movie catalogue management, including create/edit/delete and publishing fields; trending and featured ordering; live analytics and CSV export.
- **Users & Creators** — owner-only directory of registered user records and creator profiles.
- **Reviews & Notifications** — review moderation and publishing announcements into the existing PlotLab notification feed.
- **Activity Log** — read-only view of immutable `adminActivity` audit records.
- **Creative Studio** — creative brief builder, brand-aligned image-prompt builder, and editable starter caption drafts.
- **Campaigns & Content Calendar** — create campaigns, update their status, remove drafts, and view scheduled dates.
- **Brand Kit** — reads the approved original logo from `siteSettings/public.logoUrl` and documents the PlotLab palette and usage rules.
- **Access & Security** — shows the current owner-only sign-in boundary and the requirements for safely enabling staff roles.

## Firebase integration

Studio uses the existing Firebase project and the browser Firebase SDK. It does not contain service-account credentials.

- Google sign-in is restricted to the verified owner account `plotlab29@gmail.com`.
- The existing Firestore security rules remain the authority for data access.
- Movie, review, notification, analytics and creator/user data use the existing PlotLab collections.
- Campaigns and creative briefs are stored in the owner-only `siteSettings/studioWorkspace` document. This uses the existing `siteSettings` owner rule and does not require a new collection rule.
- Administrative actions are recorded in `adminActivity`; the existing rules make those records immutable.
- The public PlotLab site and its existing collections are not replaced by this repository.

## Important boundaries

- Staff roles (Admin, Marketing and Viewer) are documented but **not activated**. Secure multi-user access requires server-issued Firebase custom claims and matching Firestore rules. Do not grant staff access by changing client-side code or hiding navigation items.
- Image-prompt creation prepares a prompt for an image tool; it does not itself render an image.
- Caption drafts use local templates and are editable. No external AI API or paid generation service is connected.
- External social publishing and social-platform analytics are not connected.
- Test the deployed Studio against the live Firebase project before relying on any new workflow. Keep the existing Admin Panel available until the migrated Studio workflows have been verified end to end.

## Run locally

Serve this folder with a static web server. Add the deployed/local domain to Firebase Authentication's authorised domains before testing Google sign-in.

## Deployment checklist

1. Deploy this repository as a separate private Studio site.
2. Confirm the deployed hostname is authorised in Firebase Authentication.
3. Sign in with the verified owner Google account.
4. Test movie editing, trending order, analytics, reviews, notifications, users/creators, audit logs, campaigns and creative briefs.
5. Confirm Firestore rules remain deployed and owner-only.
6. Keep the old Admin Panel as a fallback until all production workflows pass.
