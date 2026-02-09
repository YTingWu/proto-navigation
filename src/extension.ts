import * as vscode from 'vscode';
import { CacheManager } from './cache/cacheManager';
import { ServiceFileResolver } from './services/serviceFileResolver';
import { ProtoDefinitionProvider } from './providers/definitionProvider';

const PROTO_SELECTOR: vscode.DocumentFilter = { pattern: '**/*.proto' };

export const outputChannel = vscode.window.createOutputChannel('Proto Navigation');

export function activate(context: vscode.ExtensionContext): void {
	outputChannel.appendLine('Proto Navigation extension activated');
	
	const cache = new CacheManager();
	const serviceResolver = new ServiceFileResolver(cache, outputChannel);
	const definitionProvider = new ProtoDefinitionProvider(cache, serviceResolver, outputChannel);

	// Register Definition Provider (F12 / Go to Definition)
	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider(PROTO_SELECTOR, definitionProvider),
	);

	// Register Implementation Provider (Cmd+F12 / Go to Implementation)
	context.subscriptions.push(
		vscode.languages.registerImplementationProvider(PROTO_SELECTOR, definitionProvider),
	);
	
	context.subscriptions.push(outputChannel);

	context.subscriptions.push(
		vscode.commands.registerCommand('extension.setProtoServiceFile', async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				return;
			}
			const secondLine = new vscode.Position(1, 0);
			await editor.edit(editBuilder => {
				editBuilder.insert(secondLine, '// service_file = "xxx/xxxService";\n');
			});
		}),
	);

	context.subscriptions.push(cache);
}