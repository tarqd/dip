docs:
	@doxx --source lib --target docs 
test:
	@mocha test/index.js

.PHONY: test docs
