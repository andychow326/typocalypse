.PHONY: setup
setup:
	make -C server setup
	make -C client setup

.PHONY: format
format:
	make -C server format
	make -C client format

.PHONY: ci
ci:
	make -C server ci
	make -C client ci
