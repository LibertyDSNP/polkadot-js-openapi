test-openrpc-typegen:
	yarn polkadot-types-from-chain --openrpc --endpoint ws://127.0.0.1:9944 --output packages/typegen/test/data/actual
	yarn polkadot-types-from-chain --openrpcTests --endpoint ws://127.0.0.1:9944 --output packages/typegen/test/data/expected
	yarn run test-typegen