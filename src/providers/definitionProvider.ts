import * as vscode from 'vscode';
import * as path from 'path';
import { CacheManager } from '../cache/cacheManager';
import { ServiceFileResolver } from '../services/serviceFileResolver';
import { isMessageType, findSecondOccurrence } from '../services/protoParser';

export class ProtoDefinitionProvider implements vscode.DefinitionProvider, vscode.ImplementationProvider {
	constructor(
		private readonly cache: CacheManager,
		private readonly serviceResolver: ServiceFileResolver,
		private readonly outputChannel?: vscode.OutputChannel
	) {}
	
	private log(message: string, prefix: string = 'DefinitionProvider'): void {
		if (this.outputChannel) {
			this.outputChannel.appendLine(`[${prefix}] ${message}`);
		}
	}

	async provideDefinition(
		document: vscode.TextDocument,
		position: vscode.Position,
		_token: vscode.CancellationToken,
	): Promise<vscode.Location | undefined> {
		this.log(`\n>>> provideDefinition called at ${path.basename(document.uri.fsPath)}:${position.line}:${position.character}`);
		
		const range = document.getWordRangeAtPosition(position);
		if (!range) {
			this.log('No word found at position');
			return undefined;
		}

		const word = document.getText(range);
		this.log(`Word at position: "${word}"`);

		if (isMessageType(word)) {
			this.log(`"${word}" is a message type, navigating to message definition`);
			return this.navigateToMessageDefinition(document, word);
		}

		// For service methods, jump to implementation
		this.log(`"${word}" is not a message type, treating as service method`);
		return this.navigateToServiceMethod(document, word);
	}

	async provideImplementation(
		document: vscode.TextDocument,
		position: vscode.Position,
		_token: vscode.CancellationToken,
	): Promise<vscode.Location | undefined> {
		this.log(`\n>>> provideImplementation called at ${path.basename(document.uri.fsPath)}:${position.line}:${position.character}`, 'ImplementationProvider');
		
		const range = document.getWordRangeAtPosition(position);
		if (!range) {
			this.log('No word found at position', 'ImplementationProvider');
			return undefined;
		}

		const word = document.getText(range);
		this.log(`Word at position: "${word}"`, 'ImplementationProvider');

		// For message types (Request/Response), show proto definition as implementation
		if (isMessageType(word)) {
			this.log(`"${word}" is a message type, navigating to proto definition`, 'ImplementationProvider');
			return this.navigateToMessageDefinition(document, word);
		}

		this.log(`"${word}" is a service method, navigating to implementation`, 'ImplementationProvider');
		return this.navigateToServiceMethod(document, word, 'ImplementationProvider');
	}

	private navigateToMessageDefinition(
		document: vscode.TextDocument,
		typeName: string,
	): vscode.Location | undefined {
		const text = document.getText();
		const secondIndex = findSecondOccurrence(text, typeName);
		if (secondIndex === -1) {
			return undefined;
		}

		const targetPosition = document.positionAt(secondIndex);
		return new vscode.Location(document.uri, targetPosition);
	}

	private async navigateToServiceMethod(
		document: vscode.TextDocument,
		methodName: string,
		logPrefix: string = 'DefinitionProvider'
	): Promise<vscode.Location | undefined> {
		this.log(`Navigating to service method: ${methodName}`, logPrefix);
		
		const serviceFileName = await this.serviceResolver.resolve(document, methodName);
		if (!serviceFileName) {
			this.log(`Failed to resolve service file for method: ${methodName}`, logPrefix);
			return undefined;
		}

		this.log(`Resolved service file: ${serviceFileName}`, logPrefix);
		
		const protoDir = path.dirname(document.uri.fsPath);
		const serviceFilePath = serviceFileName.endsWith('.cs') || serviceFileName.endsWith('.py')
			? serviceFileName
			: path.join(protoDir, `../${serviceFileName}.cs`);

		this.log(`Service file path: ${serviceFilePath}`, logPrefix);
		
		const file = vscode.Uri.file(serviceFilePath);
		let doc: vscode.TextDocument;

		try {
			doc = await this.cache.openDocument(file);
			this.log(`Opened document: ${file.fsPath}`, logPrefix);
		} catch (error) {
			this.log(`Failed to open document: ${error}`, logPrefix);
			return undefined;
		}

		const searchText = methodName + '(';
		this.log(`Searching for: "${searchText}"`, logPrefix);
		
		let lineNumber = doc.positionAt(doc.getText().indexOf(searchText)).line;
		this.log(`Initial search result line: ${lineNumber}`, logPrefix);

		if (lineNumber === 0) {
			this.log(`Method not found on first try, refreshing and resolving again...`, logPrefix);
			const result = await this.serviceResolver.refreshAndResolve(document, methodName);
			if (!result) {
				this.log(`Failed to find method after refresh`, logPrefix);
				return undefined;
			}
			doc = result.doc;
			lineNumber = doc.positionAt(doc.getText().indexOf(searchText)).line;
			this.log(`After refresh, line number: ${lineNumber}`, logPrefix);
		}

		const lineOffset = doc.offsetAt(new vscode.Position(lineNumber, 0));
		const charNumber = doc.getText().substring(lineOffset).indexOf(searchText);

		this.log(`Final position - line: ${lineNumber}, char: ${charNumber}`, logPrefix);

		if (lineNumber > 0 && charNumber > 0) {
			this.log(`✓ Successfully located method at ${lineNumber}:${charNumber}`, logPrefix);
			return new vscode.Location(file, new vscode.Position(lineNumber, charNumber));
		}

		this.log(`✗ Failed to locate method (line=${lineNumber}, char=${charNumber})`, logPrefix);
		return undefined;
	}
}
