import * as vscode from 'vscode';
import * as path from 'path';

const docCache = new Map<string, vscode.TextDocument>();
const serviceFileCache = new Map<string, string>();

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.languages.registerDefinitionProvider({ pattern: '**/*.proto' }, {
		async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
			const range = document.getWordRangeAtPosition(position);
			const methodName = document.getText(range);

			if (methodName.endsWith('Request') || methodName.endsWith('Response')) {
				const firstIndex = document.getText().indexOf(methodName);
				if (firstIndex !== -1) {
					const secondIndex = document.getText().indexOf(methodName, firstIndex + 1);
					if (secondIndex !== -1) {
						const targetPosition = document.positionAt(secondIndex);
						return new vscode.Location(document.uri, targetPosition);
					}
				}
			}

			// Get service_file value from cache or file
			let serviceFileName = serviceFileCache.get(document.uri.fsPath);
			if (!serviceFileName) {
				const serviceFileStart = document.getText().indexOf('service_file = "') + 16;
				const serviceFileEnd = document.getText().indexOf('";', serviceFileStart);
				if (serviceFileStart < 0 || serviceFileEnd < 0) {
					vscode.window.showInformationMessage('Could not find service_file option');
					return;
				}
				serviceFileName = document.getText().substring(serviceFileStart, serviceFileEnd);
				serviceFileCache.set(document.uri.fsPath, serviceFileName);
			}

			// Navigate to implementation
			const protoFilePath = document.uri.fsPath;
			const dir = path.dirname(protoFilePath);
			const file = vscode.Uri.file(path.join(dir, `../${serviceFileName}.cs`));

			try {
				let doc = docCache.get(file.fsPath);
				if (!doc) {
					doc = await vscode.workspace.openTextDocument(file);
					docCache.set(file.fsPath, doc);
				}
				const line = methodName + '(';
				const lineNumber = doc.positionAt(doc.getText().indexOf(line)).line;
				const charNumber = doc.getText().substring(doc.offsetAt(new vscode.Position(lineNumber, 0))).indexOf(line);
				if (lineNumber > 0 && charNumber > 0) {
					return new vscode.Location(file, new vscode.Position(lineNumber, charNumber));
				}
			} catch (error) {
				serviceFileCache.delete(document.uri.fsPath);
				vscode.window.showErrorMessage((error as Error).message);
				return;
			}
		}
	}));

	context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((document) => {
		docCache.delete(document.uri.fsPath);
		serviceFileCache.delete(document.uri.fsPath);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.setProtoServiceFile', async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const secondLine = new vscode.Position(1, 0);
			await editor.edit(editBuilder => {
			editBuilder.insert(secondLine, '// service_file = "xxx/xxxService";\n');
			});
		}
	}));
}