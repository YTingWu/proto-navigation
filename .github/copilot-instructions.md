# Proto Navigation Extension - Development Guide

## Development Workflow

### Version Management and Documentation

**IMPORTANT: Follow these steps for every development session:**

1. **First interaction of a session**: Update version number in `package.json`
   - Follow semantic versioning (MAJOR.MINOR.PATCH)
   - Increment PATCH for bug fixes
   - Increment MINOR for new features
   - Increment MAJOR for breaking changes

2. **For every feature addition or modification**:
   - Update `README.md` with new features, settings, or usage instructions
   - Update `CHANGELOG.md` following [Keep a Changelog](http://keepachangelog.com/) format
     - Add entries under appropriate sections: Added, Changed, Fixed, Removed
     - Include clear descriptions of what changed and why it matters to users

3. **Before delivery to users**:
   - **MUST** run the full test suite: `npm test`
   - All tests must pass before considering work complete
   - Fix any test failures or update tests if behavior intentionally changed

**Example workflow:**
```bash
# 1. Update package.json version (first interaction)
# 2. Make your changes
# 3. Update README.md and CHANGELOG.md
# 4. Run tests
npm test
# 5. Only deliver if all tests pass ✅
```

## Build, Test, and Lint Commands

```bash
# Build the extension
npm run compile          # Webpack bundling to dist/extension.js
npm run watch           # Watch mode for development

# Testing
npm test                # Run full test suite (includes pretest steps)
npm run compile-tests   # Compile tests to out/ directory
npm run pretest         # Run compile-tests + compile + lint

# Single test example (after compile-tests)
npx @vscode/test-cli --grep "should parse a valid directive"

# Linting
npm run lint            # ESLint on src/**/*.ts

# Packaging
npm run package         # Production build with hidden source maps
```

## Architecture Overview

This VS Code extension provides "Go to Definition" (F12) and "Go to Implementation" (Cmd+F12) navigation from `.proto` files to C# and Python service implementations.

### Module Structure

The codebase follows a **decoupled architecture** where each module has a single responsibility:

```
src/
├── extension.ts                      # Entry point - wires components, registers providers
├── providers/
│   └── definitionProvider.ts        # Implements DefinitionProvider + ImplementationProvider
├── services/
│   ├── protoParser.ts              # Pure functions for parsing proto text
│   └── serviceFileResolver.ts      # Resolves service files via directive or search
└── cache/
    └── cacheManager.ts             # Caches documents and resolved paths
```

**Data Flow:**
1. User triggers F12/Cmd+F12 in a `.proto` file
2. `definitionProvider` identifies if word is a message type or service method
3. For service methods: `serviceFileResolver` determines the implementation file
4. `cacheManager` stores resolved paths and opened documents to avoid redundant work

### Key Components

**`protoParser.ts`** - Pure utility functions:
- `parseServiceFileDirective()`: Extracts `// service_file = "path";` from proto file
- Skips double-commented lines (`////`) to avoid nested comments
- Returns `{ found, value, isPlaceholder }` structure

**`serviceFileResolver.ts`** - Resolution logic with 3-tier priority:
1. Proto file's `service_file` directive (highest priority)
2. User's `protoNavigation.implementationRootDirectory` setting
3. Default `Services/` directory

Searches for `*Service.{cs,py}` files and matches method patterns:
- C#: `\b{MethodName}\s*\(`
- Python: `\bdef\s+{MethodName}\s*\(`

**`cacheManager.ts`** - Simple Map-based caching:
- `serviceFilePaths`: proto file path → resolved service file path
- `documents`: file URI → opened TextDocument

## Key Conventions

### Service File Resolution

The extension expects a typical project structure:
```
project/
├── Protos/           # Proto files location
│   └── bill.proto
└── Services/         # Implementation files (configurable)
    ├── BillService.cs
    └── BillService.py
```

The `Services/` directory is **relative to the proto file's parent directory**, not the workspace root.

### Proto File Directives

The `service_file` directive format:
```proto
// service_file = "Services/BillService";
```

- Must be on its own line
- Value should NOT include file extension (`.cs` or `.py`)
- Placeholder value `xxx/xxxService` triggers a warning prompt
- Lines starting with `////` are ignored (nested comments)

### Message Type Detection

The extension distinguishes between:
- **Message types**: words ending in `Request` or `Response` → navigate to proto definition
- **Service methods**: other words → navigate to C#/Python implementation

This is checked via `isMessageType(word)` in `protoParser.ts`.

### Testing Patterns

Tests use VS Code's `@vscode/test-electron` framework:
- Test files: `src/test/**/*.test.ts`
- Compiled to: `out/test/**/*.test.js`
- Use `suite()` and `test()` from Mocha
- Tests run in a real VS Code instance with `xvfb-run` in CI

Example test structure:
```typescript
suite('Module Name', () => {
  let instance: ModuleName;
  
  setup(() => {
    instance = new ModuleName();
  });
  
  teardown(() => {
    instance.dispose();
  });
  
  test('should do something', () => {
    // test code
  });
});
```

### Configuration Settings

User-facing configuration:
- `protoNavigation.implementationRootDirectory` (default: `Services/`)
- Accessible via `vscode.workspace.getConfiguration('protoNavigation')`

Commands:
- `extension.setProtoServiceFile` - Insert directive template
- `extension.setImplementationRootDirectory` - Configure via dialog

### Build Output

- **Development**: `dist/extension.js` (webpack, mode: none)
- **Production**: `dist/extension.js` (webpack, mode: production, hidden source maps)
- **Tests**: `out/` directory (TypeScript compiled, not bundled)

The extension's `main` entry point in `package.json` points to `./dist/extension.js`.

### Logging

The extension creates an output channel "Proto Navigation":
- Use `outputChannel.appendLine()` for logging
- All major components accept optional `outputChannel` parameter
- Logs show search progress, file matches, and navigation decisions

### Dependencies

**Runtime:**
- `protobufjs`: Proto file parsing support

**Extensions:**
- `DrBlury.protobuf-vsc`: Language server for `.proto` files (required, auto-installed via `extensionDependencies`)

**Important:** Version 0.1.0 migrated from `zxh404.vscode-proto3` to `DrBlury.protobuf-vsc`.
