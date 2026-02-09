## Features

![Example](images/demo.gif)

* Press **F12** (Go to Definition) in a `.proto` file to navigate to message definitions or service implementations
* Press **Cmd+F12** / **Ctrl+F12** (Go to Implementation) to jump directly to C# or Python service method implementations
* Automatically detect and search for service files in the configured implementation directory (default: `Services/`)
* Supports manual service file configuration via `service_file` directive
* Detailed logging output in the "Proto Navigation" output channel

## Requirements

* **[Protobuf/gRPC Support – protobuf-vsc](https://marketplace.visualstudio.com/items?itemName=DrBlury.protobuf-vsc)** must be installed. It provides the language server, syntax highlighting, and language features for `.proto` files. This extension is declared as an `extensionDependency` and will be installed automatically.

> **Migrating from vscode-proto3?** Version 0.1.0 replaced `zxh404.vscode-proto3` with `DrBlury.protobuf-vsc`. You may uninstall vscode-proto3 after updating; both extensions can coexist, but only protobuf-vsc is required.

> **Note:** If your `.proto` file imports external `.proto` files, such as `google/protobuf/empty.proto`, the navigation process might be slower.

## Usage

### Navigation Options

| Action | Shortcut | Description |
|--------|----------|-------------|
| Go to Definition | **F12** | Navigate to message definitions or service implementations |
| Go to Implementation | **Cmd+F12** (macOS)<br>**Ctrl+F12** (Windows/Linux) | Jump directly to C# or Python service method implementation |
| Peek Definition | **Option+F12** (macOS)<br>**Alt+F12** (Windows/Linux) | Preview definition in a peek window |

### Viewing Logs

1. Open the Output panel: **Cmd+Shift+U** (macOS) or **Ctrl+Shift+U** (Windows/Linux)
2. Select **"Proto Navigation"** from the dropdown menu
3. View detailed logs about file searches and navigation results

## Architecture

The extension is organised into decoupled modules:

| Module | Responsibility |
|---|---|
| `src/extension.ts` | Activation entry point; wires components together; registers Definition and Implementation providers |
| `src/providers/definitionProvider.ts` | Implements both `DefinitionProvider` and `ImplementationProvider` – routes navigation to message or service |
| `src/services/protoParser.ts` | Pure functions for parsing proto text (`service_file` directive, message type detection) |
| `src/services/serviceFileResolver.ts` | Resolves C# and Python service files via directive or workspace search (prioritizes configured implementation directory) |
| `src/cache/cacheManager.ts` | Caches opened documents and resolved service file paths |

## Setting the Service File

There are three ways to specify the service file:

1. **Automatic Search (Recommended)**: The extension automatically searches for `*Service.cs` and `*Service.py` files in the configured implementation directory (default: `Services/`, sibling to `Protos/`). No configuration needed!

2. **Manual Directive**: Add a comment in your `.proto` file:
   ```proto
   // service_file = "Services/BillService";
   ```

3. **Command**: Use `extension.setProtoServiceFile` command (F1 → "Set Proto Service File") to insert a template directive.

### Search Priority

When looking for service implementations:
1. If `service_file` directive exists in proto file → use that path (highest priority)
2. Otherwise, search in configured implementation directory for `*Service.{cs,py}` files
3. Use regex patterns to match method definitions:
   - C#: `\b{MethodName}\s*\(`
   - Python: `\bdef\s+{MethodName}\s*\(`

## Extension Settings

This extension contributes the following settings:

* `protoNavigation.implementationRootDirectory`: Specifies the root directory to search for service implementations (default: `Services/`). This directory should be relative to the proto file's parent directory. For example:
  - `Services/` - searches in `../Services/` relative to proto file
  - `src/services/` - searches in `../src/services/` relative to proto file

### Commands

You can access these commands by pressing **F1** or **Cmd+Shift+P** (macOS) / **Ctrl+Shift+P** (Windows/Linux):

* **ProtoNavigation: Set Proto Service File** - Inserts a `service_file` directive template at the second line of the current proto file:

```proto
// service_file = "xxx/xxxService";
```

* **ProtoNavigation: Set Implementation Root Directory** - Opens a dialog to set the implementation root directory. You can choose to save it to User Settings (global) or Workspace Settings (project-specific). This setting determines where the extension searches for service implementation files.
