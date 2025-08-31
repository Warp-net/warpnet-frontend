# WARPNET-FRONTEND

[MAIN REPO](https://github.com/Warp-net/warpnet)
[DOCS](https://github.com/Warp-net/docs)

## Requirements
* npm version >= 9.2.0
* [Golang v1.24](https://go.dev/doc/install)
* [Wails v2.10.2](https://github.com/wailsapp/wails)

## How to run node (dev mode)
* commit and push your frontend changes (INCLUDING DIST FOLDER!)
* switch to main repo and call command:

```bash 
     go get github.com/Warp-net/warpnet-frontend@latest && go mod vendor
```
* in backend repo run node:
  
```bash
cd cmd/node/member # pick the member node dir
wails build -devtools -tags webkit2_41 # compile a binary
./build/bin/warpnet --node.network testnet # run binary on a testnet
```
