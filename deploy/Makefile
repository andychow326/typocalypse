GIT_HASH := git-$(shell git rev-parse HEAD)

.PHONY: require-env
require-env:
ifndef DEPLOY_ENV
	$(error DEPLOY_ENV is not set)
endif

.PHONY: install
install: require-env
	helm install typocalypse typocalypse --namespace typocalypse-$(DEPLOY_ENV) -f ./typocalypse/values.$(DEPLOY_ENV).yaml --set git.hash=$(GIT_HASH)

.PHONY: install-dry-run
install-dry-run: require-env
	helm install typocalypse typocalypse --namespace typocalypse-$(DEPLOY_ENV) -f ./typocalypse/values.$(DEPLOY_ENV).yaml --set git.hash=$(GIT_HASH) --debug --dry-run

.PHONY: upgrade
upgrade: require-env
	helm upgrade typocalypse typocalypse --namespace typocalypse-$(DEPLOY_ENV) -f ./typocalypse/values.$(DEPLOY_ENV).yaml --set git.hash=$(GIT_HASH)

.PHONY: upgrade-dry-run
upgrade-dry-run: require-env
	helm upgrade typocalypse typocalypse --namespace typocalypse-$(DEPLOY_ENV) -f ./typocalypse/values.$(DEPLOY_ENV).yaml --set git.hash=$(GIT_HASH) --debug --dry-run
