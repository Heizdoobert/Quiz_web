# Makefile for Quick Quiz project

# Variables
WEB_DIR := .
MOBILE_DIR := mobile

# Default target
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  install        - Install web dependencies (npm ci)"
	@echo "  dev            - Run web development server (npm run dev)"
	@echo "  build          - Build production web app (npm run build)"
	@echo "  test           - Run all tests (npm test)"
	@echo "  lint           - Run linter (npm run lint)"
	@echo "  check          - Run type-check, lint, security, architecture, and tests (npm run check:task)"
	@echo "  mobile-install - Install Flutter dependencies (flutter pub get)"
	@echo "  mobile-dev     - Run Flutter app on device/emulator"
	@echo "  mobile-build   - Build release APKs (flutter build apk --release --split-per-abi)"

# Web commands
.PHONY: install dev build test lint check
install:
	cd $(WEB_DIR) && npm install --legacy-peer-deps

dev:
	cd $(WEB_DIR) && npm run dev

build:
	cd $(WEB_DIR) && npm run build

test:
	cd $(WEB_DIR) && npm test

lint:
	cd $(WEB_DIR) && npm run lint

check:
	cd $(WEB_DIR) && npm run check:task

# Mobile commands
.PHONY: mobile-install mobile-dev mobile-build
mobile-install:
	cd $(MOBILE_DIR) && flutter pub get

mobile-dev:
	cd $(MOBILE_DIR) && flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/mobile/v1

mobile-build:
	cd $(MOBILE_DIR) && flutter build apk --release --split-per-abi
