import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CacheManager } from '../cache/cacheManager';
import { parseServiceFileDirective } from './protoParser';

export class ServiceFileResolver {
	constructor(
		private readonly cache: CacheManager,
		private readonly outputChannel?: vscode.OutputChannel
	) {}
	
	private log(message: string): void {
		if (this.outputChannel) {
			this.outputChannel.appendLine(`[ServiceFileResolver] ${message}`);
		}
	}

	async resolve(document: vscode.TextDocument, methodName: string): Promise<string | null> {
		this.log(`Resolving service file for method: ${methodName} in ${path.basename(document.uri.fsPath)}`);
		
		const cached = this.cache.getServiceFile(document.uri.fsPath);
		if (cached) {
			this.log(`Found cached service file: ${cached}`);
			return cached;
		}

		const directive = parseServiceFileDirective(document.getText());
		this.log(`Directive found: ${directive.found}, isPlaceholder: ${directive.isPlaceholder}, value: ${directive.value}`);

		if (!directive.found) {
			this.log(`No service_file directive found, searching for method ${methodName}...`);
			return this.findBySearching(methodName, document.uri.fsPath);
		}

		if (directive.isPlaceholder) {
			this.log('Placeholder directive detected');
			vscode.window.showInformationMessage('Please set service_file option');
			return null;
		}

		this.log(`Using directive value: ${directive.value}`);
		this.cache.setServiceFile(document.uri.fsPath, directive.value!);
		return directive.value;
	}

	async refreshAndResolve(
		document: vscode.TextDocument,
		methodName: string,
	): Promise<{ serviceFileName: string; file: vscode.Uri; doc: vscode.TextDocument } | null> {
		this.cache.clearServiceFile(document.uri.fsPath);

		const serviceUri = await this.searchForServiceFile(methodName, document.uri.fsPath);
		if (!serviceUri) {
			return null;
		}

		const serviceFileName = serviceUri.fsPath;
		this.cache.setServiceFile(document.uri.fsPath, serviceFileName);

		const protoDir = path.dirname(document.uri.fsPath);
		const serviceFilePath = serviceFileName.endsWith('.cs') || serviceFileName.endsWith('.py')
			? serviceFileName
			: path.join(protoDir, `../${serviceFileName}.cs`);

		const file = vscode.Uri.file(serviceFilePath);
		const doc = await this.cache.openDocument(file);
		return { serviceFileName, file, doc };
	}

	private async findBySearching(methodName: string, filePath: string): Promise<string | null> {
		const result = await this.searchForServiceFile(methodName, filePath);
		if (!result) {
			return null;
		}
		const serviceFileName = result.fsPath;
		this.cache.setServiceFile(filePath, serviceFileName);
		return serviceFileName;
	}

	private async searchForServiceFile(
		functionName: string,
		currentFilePath: string,
	): Promise<vscode.Uri | undefined> {
		this.log(`\n=== Searching for service file ===`);
		this.log(`Function name: ${functionName}`);
		this.log(`Current file: ${currentFilePath}`);
		
		// Get the directory containing the current proto file (e.g., Protos/)
		const protoDir = path.dirname(currentFilePath);
		this.log(`Proto directory: ${protoDir}`);
		
		// Get the parent directory (e.g., if Protos is in src/, get src/)
		const parentDir = path.dirname(protoDir);
		this.log(`Parent directory: ${parentDir}`);
		
		// Get configured implementation root directory, default to 'Services/'
		const config = vscode.workspace.getConfiguration('protoNavigation');
		const implRootDir = config.get<string>('implementationRootDirectory', 'Services/');
		// Remove trailing slash if present
		const cleanImplRoot = implRootDir.replace(/\/$/, '');
		
		// Implementation directory should be at the same level as Protos
		const implementationDir = path.join(parentDir, cleanImplRoot);
		this.log(`Implementation directory (from config): ${implementationDir}`);
		
		// Search for both C# and Python service files
		let files: vscode.Uri[] = [];
		
		try {
			this.log(`Searching in implementation directory: ${implementationDir}/**/*Service.{cs,py}`);
			const csFiles = await vscode.workspace.findFiles(
				new vscode.RelativePattern(implementationDir, '**/*Service.cs'),
				'{**/bin/**,**/obj/**}',
			);
			const pyFiles = await vscode.workspace.findFiles(
				new vscode.RelativePattern(implementationDir, '**/*Service.py'),
				'{**/__pycache__/**,**/venv/**,**/.venv/**}',
			);
			files = [...csFiles, ...pyFiles];
			this.log(`Found ${files.length} files in implementation directory (${csFiles.length} C#, ${pyFiles.length} Python)`);
		} catch (error) {
			this.log(`Error searching implementation directory, trying parent: ${error}`);
			// If implementation directory doesn't exist, try parent directory
			const csFiles = await vscode.workspace.findFiles(
				new vscode.RelativePattern(parentDir, '**/*Service.cs'),
				'{**/bin/**,**/obj/**,**/Protos/**}',
			);
			const pyFiles = await vscode.workspace.findFiles(
				new vscode.RelativePattern(parentDir, '**/*Service.py'),
				'{**/__pycache__/**,**/venv/**,**/.venv/**,**/Protos/**}',
			);
			files = [...csFiles, ...pyFiles];
			this.log(`Found ${files.length} files in parent directory (${csFiles.length} C#, ${pyFiles.length} Python)`);
		}

		if (files.length === 0) {
			this.log('No service files found!');
			return undefined;
		}

		this.log(`\nChecking ${files.length} service files:`);
		files.forEach((file, index) => {
			this.log(`  ${index + 1}. ${file.fsPath}`);
		});

		// Search for C# pattern: MethodName( or Python pattern: def MethodName(
		const csharpPattern = new RegExp(`\\b${functionName}\\s*\\(`);
		const pythonPattern = new RegExp(`\\bdef\\s+${functionName}\\s*\\(`);
		this.log(`\nSearching for patterns:`);
		this.log(`  C#: \\b${functionName}\\s*\\(`);
		this.log(`  Python: \\bdef\\s+${functionName}\\s*\\(`);

		for (const file of files) {
			try {
				this.log(`\nChecking file: ${path.basename(file.fsPath)}`);
				const content = fs.readFileSync(file.fsPath, 'utf-8');
				const isPython = file.fsPath.endsWith('.py');
				const pattern = isPython ? pythonPattern : csharpPattern;
				
				// Check if the service file contains the function
				if (pattern.test(content)) {
					this.log(`  ✓ Found match for ${functionName} in ${path.basename(file.fsPath)}`);
					// Make sure this function is not just defined in the proto file itself
					// (we want the implementation, not the proto definition)
					if (!file.fsPath.includes('.proto')) {
						this.log(`  ✓ File is not a proto file, returning: ${file.fsPath}`);
						return file;
					} else {
						this.log(`  ✗ File is a proto file, skipping`);
					}
				} else {
					this.log(`  ✗ No match for ${functionName}`);
				}
			} catch (error) {
				this.log(`  ✗ Error reading file: ${error}`);
			}
		}
		
		this.log(`\n=== Search completed - no matching file found ===\n`);
		return undefined;
	}
}
