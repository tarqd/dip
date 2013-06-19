docs:
	@doxx --source lib --target docs 
test:
	@node test/index.js

.PHONY: test docs
