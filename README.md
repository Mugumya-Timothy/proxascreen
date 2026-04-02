# ProxaScreen

ProxaScreen is a clinical decision-support platform for prostate cancer risk screening. Clinicians register patients, enter clinical features (age, BMI, smoking status, diet, activity level, family history, and examination history), and receive a machine-learning-generated risk stratification — Low, Medium, or High — with probability percentages for each class. Administrators manage clinician accounts, review platform-wide statistics, and can bulk-import patient cohorts from CSV or XLSX files. Each assessment can be exported as a branded PDF report.

The system is composed of three services that run together via Docker Compose.

---

## Architecture

| Service | Technology | Port |
|---|---|---|
| `frontend` | React 18, TypeScript, Vite, TailwindCSS, Clerk | 5173 |
| `api` | Go 1.23, Gin, PostgreSQL (Neon), Clerk JWT auth | 8081 |
| `model-service` | Python 3.11, FastAPI, scikit-learn | 8000 |

The frontend authenticates users through Clerk. Every request to the API carries a Clerk JWT, which the backend verifies using the Clerk secret key. The backend calls the model service internally over the Docker Compose network — the model service is never exposed to the browser directly.

---

## Monorepo Structure

```
proxascreen/
├── docker-compose.yml          # Orchestrates all three services
├── Makefile                    # Developer shortcuts
├── proxascreen.json            # Postman collection (all API endpoints)
│
├── backend/
│   ├── Dockerfile
│   ├── go.mod
│   ├── cmd/server/main.go      # Entry point; loads config and starts Gin
│   └── internal/
│       ├── config/             # Reads environment variables
│       ├── database/           # pgxpool connection setup
│       ├── handlers/           # HTTP handler functions (one file per domain)
│       ├── middleware/         # Clerk JWT verification, role enforcement
│       ├── models/             # Shared Go structs
│       ├── routes/             # Route registration
│       └── services/           # Business logic (user, patient, assessment, email)
│   └── migrations/             # Goose SQL migration files
│
├── frontend/
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── App.tsx             # Route definitions
│       ├── components/         # Shared UI components
│       ├── hooks/
│       ├── layouts/            # AdminLayout, ClinicianLayout, AppLayout
│       ├── pages/
│       │   ├── admin/          # Admin-only pages
│       │   └── clinician/      # Clinician-facing pages
│       ├── services/           # API call functions (axios)
│       ├── store/              # Redux Toolkit slices
│       ├── types/              # Shared TypeScript interfaces
│       └── utils/
│           └── generatePDF.ts  # jsPDF assessment report generator
│
└── model-service/
    ├── Dockerfile
    ├── main.py                 # FastAPI app with /health and /predict endpoints
    ├── model.py                # Loads .pkl artefacts and exposes predict()
    ├── requirements.txt
    └── models/                 # Place your four .pkl artefacts here (see below)
```

---

## Prerequisites

The following tools must be installed on the host machine before running the project outside of Docker, or for running migrations.

| Tool | Minimum version | Purpose |
|---|---|---|
| Docker | 24 | Build and run all services |
| Docker Compose | v2 (plugin) | Orchestrate the multi-service stack |
| Go | 1.23 | Build the backend outside Docker; run migrations |
| goose | latest | Database migration runner (`go install github.com/pressly/goose/v3/cmd/goose@latest`) |
| Node.js | 20 | Frontend local development outside Docker |
| Python | 3.11 | Model service local development outside Docker |

---

## Environment Variables

Create a `.env` file in the project root. All variables are required unless marked optional.

```dotenv
# PostgreSQL connection string — Neon serverless recommended
# Format: postgres://user:password@host/dbname?sslmode=require
DATABASE_URL=postgres://...

# Clerk secret key (starts with sk_live_ or sk_test_)
CLERK_SECRET_KEY=sk_test_...

# Clerk publishable key (starts with pk_live_ or pk_test_)
# Used by the frontend (Vite exposes it as VITE_CLERK_PUBLISHABLE_KEY automatically)
CLERK_PUBLISHABLE_KEY=pk_test_...

# Clerk webhook signing secret — obtained after creating the webhook endpoint in the Clerk dashboard
CLERK_WEBHOOK_SECRET=whsec_...

# Resend API key for transactional email (password reset confirmations, welcome emails)
RESEND_API_KEY=re_...

# Internal URL used by the backend container to reach the model service
# The default value works inside Docker Compose and does not need to be changed
MODEL_SERVICE_URL=http://model-service:8000
```

The frontend container reads `CLERK_PUBLISHABLE_KEY` from `.env` and the Compose file passes it through as `VITE_CLERK_PUBLISHABLE_KEY`.

---

## Model Artefacts

The model service requires four scikit-learn artefact files that are not included in the repository. Place them in `model-service/models/` before running the stack.

| File | Description |
|---|---|
| `prostate_cancer_model.pkl` | Trained classifier with `predict_proba` support |
| `scaler.pkl` | Fitted `StandardScaler` (or equivalent) for numeric features |
| `label_encoders.pkl` | Fitted `LabelEncoder` for the target classes (Low, Medium, High) |
| `feature_cols.pkl` | Python list of feature names in the exact order the model expects |

The model service validates that all four files exist at startup. If any file is missing, the container will refuse to start and log the missing path.

---

## Database Migrations

Migrations are managed with [goose](https://github.com/pressly/goose) and live in `backend/migrations/`. Run them against your Neon (or any PostgreSQL) database before starting the stack for the first time.

```bash
make migrate-up
```

This command reads `DATABASE_URL` from `.env` automatically if it is not already exported in the shell. Run it again after pulling new migration files.

The migrations create the `users`, `patients`, and `assessments` tables and seed a placeholder admin row. The admin row's `clerk_id` must be updated to match the real Clerk user ID once the admin account is created (see Clerk Setup below).

---

## Clerk Setup

ProxaScreen uses [Clerk](https://clerk.com) for authentication. All users, sessions, and JWTs are managed by Clerk. The backend does not issue its own tokens.

### 1. Create a Clerk application

- Log in to the [Clerk dashboard](https://dashboard.clerk.com) and create a new application.
- Enable the **Email + Password** authentication strategy. Disable social login if not needed.
- Copy the **Publishable Key** and **Secret Key** into `.env`.

### 2. Create the admin user

The first administrator account must be created manually through the Clerk dashboard because the signup flow is not exposed publicly.

- In the Clerk dashboard, go to **Users** and click **Create user**.
- Enter the admin's email address and a strong password.
- After the user is created, open the user detail page and navigate to **Metadata — Public**.
- Add the following JSON to the public metadata field and save:

```json
{
  "role": "admin"
}
```

- Copy the user's **User ID** (format: `user_...`).
- Update the seeded placeholder row in the database so the `clerk_id` column matches this ID:

```sql
UPDATE users SET clerk_id = 'user_YOUR_CLERK_ID' WHERE email = 'info@proxascreen.me';
```

  Replace `info@proxascreen.me` and the `clerk_id` value with the actual admin email and Clerk user ID if they differ from the seed file.

### 3. Configure the webhook

The backend listens for `user.created` and `user.updated` events from Clerk to keep the local user table in sync whenever a clinician account is created or updated.

- In the Clerk dashboard, go to **Webhooks** and click **Add Endpoint**.
- Set the **Endpoint URL** to the publicly accessible URL of the backend followed by `/webhooks/clerk`, for example: `https://api.your-domain.com/webhooks/clerk`. During local development you can use a tunnel such as [ngrok](https://ngrok.com): `ngrok http 8081`.
- Under **Subscribe to events**, enable `user.created` and `user.updated`.
- Save the endpoint. Clerk will display a **Signing Secret** (starts with `whsec_`). Copy it into `CLERK_WEBHOOK_SECRET` in your `.env` file.

The webhook endpoint is unauthenticated at the HTTP level but verifies the svix signature on every request. Requests with an invalid signature are rejected with a 401.

---

## Resend Configuration

ProxaScreen uses [Resend](https://resend.com) to send transactional emails — welcome messages when a clinician account is created and password reset confirmations.

- Create a Resend account and go to **API Keys**. Generate a key and copy it into `RESEND_API_KEY` in `.env`.
- Add and verify your sending domain under **Domains**. Resend will provide DNS records (MX, SPF, DKIM) to add to your domain's DNS. Emails sent from an unverified domain will be rejected.
- The `from` address used in outgoing emails is configured in `backend/internal/services/email_service.go`. Update it to match a verified address on your Resend domain before deploying.

---

## Running the Stack

Once the `.env` file is populated, model artefacts are in place, migrations have been run, and Clerk is configured, start all three services with a single command:

```bash
make dev
```

This runs `docker compose up --build`, which builds fresh images for all three services and starts them. The first build will take a few minutes as Go modules and Python packages are downloaded.

To stop all services:

```bash
make down
```

---

## Accessing the Services

Once the stack is running:

| Service | URL | Notes |
|---|---|---|
| Frontend | http://localhost:5173 | React application |
| Backend API | http://localhost:8081 | REST API; `GET /health` confirms liveness |
| Model service | http://localhost:8000 | FastAPI; `GET /health` and `GET /docs` (Swagger UI) |

---

## API Reference

A complete Postman collection is included at `proxascreen.json` in the project root. Import it into Postman using **File > Import**, then set the `clerk_token` collection variable to a valid Clerk session JWT. To obtain a token from a logged-in browser session, open the browser console on the frontend and run:

```js
await window.Clerk.session.getToken()
```

The collection groups endpoints by domain: Health, Webhooks, Auth, Dashboard, Patients, Assessments, and Clinicians. Each request includes an example response body. The `patient_id`, `assessment_id`, and `clinician_id` variables are automatically populated by the test scripts on the Create requests.
