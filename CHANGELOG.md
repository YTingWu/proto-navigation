# Change Log

All notable changes to the "proto-navigation" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.1.0] – 2026-02-09

### Added
- **Implementation Provider**: Added support for "Go to Implementation" (Cmd+F12 / Ctrl+F12) to jump directly to C# service method implementations
- **Detailed Logging**: New "Proto Navigation" output channel showing search process, file matches, and navigation results
- **Auto-activation**: Extension now automatically activates when opening `.proto` files or when workspace contains proto files
- **Smart Search**: Automatically searches for service implementations in `Services/` directory when no `service_file` directive is specified
- Comprehensive test suite covering proto parser, cache manager, and integration with real `.proto` files
- GitHub Actions CI/CD pipeline: lint, test, and package on push/PR; publish `.vsix` on tagged release
- Architecture documentation in README

### Changed
- **Breaking:** Replaced dependency on `zxh404.vscode-proto3` with `DrBlury.protobuf-vsc` for language server and syntax support
- Refactored monolithic `extension.ts` into decoupled modules: `providers/definitionProvider`, `services/protoParser`, `services/serviceFileResolver`, and `cache/cacheManager`
- Activation events now support `onLanguage:proto`, `onLanguage:proto3`, `onLanguage:protobuf`, and `workspaceContains:**/*.proto`
- Improved service file search with priority: Services directory → parent directory → fallback
- Enhanced proto parser to skip double-commented directives (`////`)

### Fixed
- Go to Definition and navigation features now work correctly with the protobuf-vsc language server
- Improved error handling throughout the definition provider and service file resolver
- Service file search now excludes proto files and uses precise regex matching

## [Unreleased]

- Initial release