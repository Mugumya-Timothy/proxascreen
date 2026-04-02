.PHONY: dev down migrate-up

dev:
	docker compose up --build

down:
	docker compose down

migrate-up:
	@if [ -z "$(DATABASE_URL)" ]; then \
		export $$(cat .env | grep -v '^#' | xargs) && goose -dir backend/migrations postgres "$$DATABASE_URL" up; \
	else \
		goose -dir backend/migrations postgres "$(DATABASE_URL)" up; \
	fi
