# PlotLab Studio

Private command centre for the PlotLab ecosystem. This repository is intentionally separate from the public PlotLab website.

## Current foundation

- Responsive dark dashboard using PlotLab's charcoal, black and orange visual direction
- Overview and navigation
- Administration workspace shell
- Creative brief builder and starter caption workflow
- Campaign planner and content calendar (local browser drafts)
- Analytics placeholder
- Brand kit guidance
- Proposed role and security model

## Run locally

Open `index.html` in a browser, or serve this folder with any static web server.

## Important: integration status

This is the first UI foundation, not a production-connected admin system.

- No Firebase credentials are included.
- No live PlotLab data is read or written.
- Campaigns and creative briefs currently use browser localStorage only.
- Authentication, authorization, Firestore integration, image generation, AI copy generation, publishing and audit logs are not yet implemented.
- The existing PlotLab website and its Firebase data are not modified by this repository.

## Planned secure integration

Before enabling platform operations:

1. Configure Firebase Authentication for Studio sign-in.
2. Establish trusted admin roles (prefer server-assigned custom claims).
3. Enforce access through Firestore Security Rules and/or a trusted backend.
4. Keep privileged service credentials off the client.
5. Add audit logs and confirmation flows for sensitive operations.
6. Connect existing PlotLab collections only after reviewing their schemas and current security rules.

Never treat a hidden route, hidden button, or client-side role check as security.

## Deployment

The app can be deployed as a separate static site (for example, through Netlify or GitHub Pages for UI preview). Do not expose a production admin workspace publicly until authentication and backend authorization have been implemented and tested.
