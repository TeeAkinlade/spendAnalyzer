# Spend Analyzer

Spend Analyzer is a full-stack budget and expense planner with email reminder
support. The app includes:

- React + Vite frontend with Tailwind styles
- Express backend with MongoDB persistence via Mongoose
- Budget planning, summary, and history tracking
- Reminder creation and scheduled email delivery

## Project layout

- `client/` - React application
- `server/` - Express API and scheduler
- `server/lib/` - database, email, and scheduler helpers
- `server/routes/` - API routes for budget and reminders

## Features

- Create and update spend plans with income, fixed expenses, and savings
- Get a budget summary and view budget history
- Schedule reminder emails for future dates
- Email scheduler runs every 30 seconds to send due reminders

## Requirements

- Node.js 20 or newer
- MongoDB connection string
- SMTP email credentials for reminders

## Installation

From the project root:

```bash
npm install
npm install --prefix client
```

Or run the combined install script:

```bash
npm run install:all
```

## Environment variables

Create a `.env` file in the project root with these values:

```env
PORT=3001
MONGODB_URI=<your-mongodb-uri>
EMAIL_HOST=<smtp-host>
EMAIL_PORT=<smtp-port>
EMAIL_USER=<smtp-username>
EMAIL_PASS=<smtp-password>
EMAIL_FROM="Spend Analyzer <noreply@example.com>"
REMINDER_TO_EMAIL=<default-recipient-email>
SMTP_TLS_REJECT_UNAUTHORIZED=false
# Optional
TZ=UTC
```

> Do not commit `.env` or any credentials to source control.

## Running locally

Start both server and client together:

```bash
npm run dev
```

This runs:

- server: `server/index.js` on `http://localhost:3001`
- client: Vite frontend on its default port (usually `http://localhost:5173`)

If you only want to run the backend:

```bash
npm run server
```

## Client commands

From the root, you can also run client scripts directly:

```bash
npm run client -- --help
```

Common client commands:

```bash
npm run client -- dev
npm run client -- build
npm run client -- preview
```

## API endpoints

Base API path: `/api`

### Budget

- `GET /api/budget` - get current budget plan
- `GET /api/budget/history` - get saved budget history
- `GET /api/budget/summary` - get computed budget totals
- `GET /api/budget/:id` - get a specific budget by ID
- `POST /api/budget` - create a budget plan
- `PUT /api/budget/:id` - update a budget plan

### Reminders

- `GET /api/reminders` - list reminders
- `POST /api/reminders` - create a new reminder
- `PUT /api/reminders/:id` - update an existing reminder
- `DELETE /api/reminders/:id` - delete a reminder

## Client usage

The frontend provides:

- budget planning screen
- reminders screen
- history view for saved plans

The app uses the `X-Client-Id` header to scope budgets and reminders per client.

## Deployment notes

- `render.yaml` contains the backend deployment configuration for Render.
- `client/vercel.json` rewrites all frontend routes to `index.html`.

If deploying the API separately, ensure the server can access the same MongoDB
database and SMTP credentials.

## Troubleshooting

- `MONGODB_URI` must be valid and reachable
- Email reminders require correct SMTP settings
- Scheduler only sends email when all required email env vars are configured

## License

This project is provided as-is.
