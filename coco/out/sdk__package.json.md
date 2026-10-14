# sdk/package.json
lines:90 exports:
---
{
  "name": "@heizdoobert/quickquiz-sdk",
  "version": "0.3.0",
  "description": "Official TypeScript SDK for Quick Quiz",
  "license": "MIT",
  "author": "Heizdoobert",
  "homepage": "https://github.com/Heizdoobert/SDK-for-web#readme",
  "bugs": {
    "url": "https://github.com/Heizdoobert/SDK-for-web/issues"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Heizdoobert/SDK-for-web.git"
  },
  "keywords": [
    "quickquiz",
    "trivia",
    "quiz",
    "sdk",
    "typescript",
    "api"
  ],
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "typesVersions": {
    "*": {
      "client": [
        "./dist/client.d.ts"
      ],
      "server": [
        "./dist/server.d.ts"
      ]
    }
  },
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.mjs"
