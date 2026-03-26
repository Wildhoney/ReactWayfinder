.PHONY: build example fmt lint typecheck unit integration checks

build:
	yarn build

example:
	cd example && npx vite --open

fmt:
	yarn fmt

lint:
	yarn lint

typecheck:
	yarn typecheck

unit:
	yarn test

integration:
	npx playwright test

checks: fmt lint typecheck unit build
