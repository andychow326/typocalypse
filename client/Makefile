.PHONY: setup
setup:
	cp config_local.gd config.gd

.PHONY: start
start:
	bunx local-web-server \
		--hostname "0.0.0.0" \
		--port "8000" \
		--cors.embedder-policy "require-corp" \
		--cors.opener-policy "same-origin" \
		--directory "./build"
