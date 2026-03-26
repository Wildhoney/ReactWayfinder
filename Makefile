.PHONY: build preview fmt lint typecheck unit integration circular fslint checks deploy

build:
	yarn build

preview:
	cd example && npx vite --open

fmt:
	yarn fmt

lint:
	yarn lint
	npx madge --circular src/index.tsx

typecheck:
	yarn typecheck

unit:
	yarn test

integration:
	npx playwright test

circular:
	npx madge --circular src/index.tsx

fslint:
	npx fslint --files=dist/**/*.js --limit-kb=10

checks: fmt lint typecheck circular unit build fslint

deploy:
	yarn --force
	make build
	npx commit-and-tag-version
	npm publish
	git push
	git push --tags
