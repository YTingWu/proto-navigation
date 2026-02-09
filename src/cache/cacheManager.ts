import * as vscode from 'vscode';

export class CacheManager implements vscode.Disposable {
	private readonly documentCache = new Map<string, vscode.TextDocument>();
	private readonly serviceFileCache = new Map<string, string>();

	getServiceFile(key: string): string | undefined {
		return this.serviceFileCache.get(key);
	}

	setServiceFile(key: string, value: string): void {
		this.serviceFileCache.set(key, value);
	}

	clearServiceFile(key: string): void {
		this.serviceFileCache.delete(key);
	}

	async openDocument(uri: vscode.Uri): Promise<vscode.TextDocument> {
		const cached = this.documentCache.get(uri.fsPath);
		if (cached) {
			return cached;
		}
		const doc = await vscode.workspace.openTextDocument(uri);
		this.documentCache.set(uri.fsPath, doc);
		return doc;
	}

	dispose(): void {
		this.documentCache.clear();
		this.serviceFileCache.clear();
	}
}
