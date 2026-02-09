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
				vscode.window.showWarningMessage('No active editor found');
				return;
			}
			const secondLine = new vscode.Position(1, 0);
			await editor.edit(editBuilder => {
				editBuilder.insert(secondLine, '// service_file = "xxx/xxxService";\n');
			});
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('extension.setImplementationRootDirectory', async () => {
			const config = vscode.workspace.getConfiguration('protoNavigation');
			const currentValue = config.get<string>('implementationRootDirectory', 'Services/');
			
			const newValue = await vscode.window.showInputBox({
				prompt: 'Enter the implementation root directory path (relative to proto file\'s parent directory)',
				placeHolder: 'Services/ or src/services/',
				value: currentValue,
				validateInput: (value: string) => {
					if (!value || value.trim() === '') {
						return 'Path cannot be empty';
					}
					return null;
				}
			});

			if (newValue !== undefined) {
				const target = await vscode.window.showQuickPick(
					[
						{ label: 'User Settings', value: vscode.ConfigurationTarget.Global },
						{ label: 'Workspace Settings', value: vscode.ConfigurationTarget.Workspace }
					],
					{
						placeHolder: 'Select where to save this setting'
					}
				);

				if (target) {
					await config.update('implementationRootDirectory', newValue, target.value);
					vscode.window.showInformationMessage(
						`Implementation root directory set to: ${newValue} (${target.label})`
					);
				}
			}
		}),
	);

	context.subscriptions.push(cache);
}