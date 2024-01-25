import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

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

			let serviceFileName = await getServiceFile(document, methodName);
			if (!serviceFileName) {
				return;
			}

			const protoDir = path.dirname(document.uri.fsPath);
            let serviceFilePath = serviceFileName.endsWith('.cs') ? serviceFileName : path.join(protoDir, `../${serviceFileName}.cs`);

            let file = vscode.Uri.file(serviceFilePath);
            let doc = await getDocument(file);

            const line = methodName + '(';
            let lineNumber = doc.positionAt(doc.getText().indexOf(line)).line;
            if (lineNumber === 0) {
                const result = await updateServiceFileAndDocument(serviceFileName, document, methodName, protoDir);
                if (!result) {
                    return;
                }

                ({ serviceFileName, file, doc } = result);
                lineNumber = doc.positionAt(doc.getText().indexOf(line)).line;
			}

			let charNumber = doc.getText().substring(doc.offsetAt(new vscode.Position(lineNumber, 0))).indexOf(line);
            if (lineNumber > 0 && charNumber > 0) {
                return new vscode.Location(file, new vscode.Position(lineNumber, charNumber));
            }
		}
	}));

	async function getServiceFile(document: vscode.TextDocument, methodName: string): Promise<string | null> {
		let serviceFileName = serviceFileCache.get(document.uri.fsPath);
		if (!serviceFileName) {
			const serviceFileStart = document.getText().indexOf('service_file = "') + 16;
			const serviceFileEnd = document.getText().indexOf('";', serviceFileStart);

			if (serviceFileStart === 15 || serviceFileEnd < 0) {
				const serviceFile = await findFunctionService(methodName, document.uri.fsPath);
				if (serviceFile) {
					serviceFileName = serviceFile.fsPath;
					serviceFileCache.set(document.uri.fsPath, serviceFileName);
				} else {
					vscode.commands.executeCommand('extension.setProtoServiceFile');
					return null;
				}
			} else {
				serviceFileName = document.getText().substring(serviceFileStart, serviceFileEnd);
				if (serviceFileName === 'xxx/xxxService') {
					vscode.window.showInformationMessage('Please set service_file option');
					return null;
				}
				serviceFileCache.set(document.uri.fsPath, serviceFileName);
			}
		}
		return serviceFileName;
	}

	async function getDocument(file: vscode.Uri): Promise<vscode.TextDocument> {
		let doc = docCache.get(file.fsPath);
		if (!doc) {
			doc = await vscode.workspace.openTextDocument(file);
			docCache.set(file.fsPath, doc);
		}
		return doc;
	}

	async function updateServiceFileAndDocument(serviceFileName: string, document: vscode.TextDocument, methodName: string, protoDir: string) {
		serviceFileCache.delete(document.uri.fsPath);
		const serviceFile = await findFunctionService(methodName, document.uri.fsPath);
		if (!serviceFile) {
			return null;
		}
	
		serviceFileName = serviceFile.fsPath;
		serviceFileCache.set(document.uri.fsPath, serviceFileName);
		const serviceFilePath = serviceFileName.endsWith('.cs') ? serviceFileName : path.join(protoDir, `../${serviceFileName}.cs`);
		const file = vscode.Uri.file(serviceFilePath);
		const doc = await getDocument(file);
	
		return { serviceFileName, file, doc };
	}

	function findFunctionService(functionName: string, currentFilePath: string): Thenable<vscode.Uri | undefined> {
		return new Promise((resolve, reject) => {
			const currentDir = path.dirname(currentFilePath);
			const parentDir = path.join(currentDir, '..');

			const files = vscode.workspace.findFiles(new vscode.RelativePattern(parentDir, '**/*Service.cs'), '{**/bin/**,**/obj/**}');
			files.then((files) => {
				for (const file of files) {
					const content = fs.readFileSync(file.fsPath, 'utf-8');
					if (content.includes(functionName)) {
						resolve(file);
						return;
					}
				}
				resolve(undefined);
			}, (error) => {
				reject(error);
			});
		});
	}

	// context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((document) => {
	// 	docCache.delete(document.uri.fsPath);
	// 	serviceFileCache.delete(document.uri.fsPath);
	// }));

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