# ─── Stage 1: migrate ────────────────────────────────────────────────────────
# Used to run goose migrations before the app starts in production.
FROM golang:1.24-alpine AS migrate
RUN go install github.com/pressly/goose/v3/cmd/goose@latest
WORKDIR /migrations
COPY migrations/ .

# ─── Stage 2: dev ────────────────────────────────────────────────────────────
# Runs the application with Air for live-reload during development.
FROM golang:1.24-alpine AS dev
RUN go install github.com/air-verse/air@latest
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
EXPOSE 8081
CMD ["air", "-c", ".air.toml"]

# ─── Stage 3: builder ────────────────────────────────────────────────────────
# Compiles the production binary.
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/bin/server ./cmd/server

# ─── Stage 4: production ─────────────────────────────────────────────────────
# Reuses the golang:1.23-alpine image already pulled for the builder stage,
# avoiding a separate alpine:3.20 pull.
FROM golang:1.24-alpine AS production
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/bin/server .
EXPOSE 8081
CMD ["./server"]
