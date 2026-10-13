.PHONY: api web dev install-api install-web test test-api test-web lint evals

API_ENV = PYTHONPATH="../../packages:."

install-api:
	cd apps/api && pip install -r requirements-dev.txt

install-web:
	cd apps/web && npm install

api:
	cd apps/api && $(API_ENV) uvicorn spice.main:app --reload --port 5000

web:
	cd apps/web && npm run dev

dev:
	$(MAKE) api & $(MAKE) web & wait

test-api:
	cd apps/api && $(API_ENV) python3 -m pytest -q

test-web:
	cd apps/web && npm run typecheck && npm test

test: test-api test-web

lint:
	cd apps/api && python3 -m ruff check . && python3 -m ruff format --check .

# Runs against the real model; needs OPENAI_API_KEY.
evals:
	cd apps/api && $(API_ENV) python3 -m evals.run
