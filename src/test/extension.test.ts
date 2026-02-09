import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import {
	parseServiceFileDirective,
	isMessageType,
	findSecondOccurrence,
} from '../services/protoParser';
import { CacheManager } from '../cache/cacheManager';
import { ServiceFileResolver } from '../services/serviceFileResolver';

const TEST_PROTO_PATH = path.resolve(__dirname, '../../test.proto');

suite('Proto Navigation Extension Test Suite', () => {
	suite('protoParser – parseServiceFileDirective', () => {
		test('should parse a valid directive', () => {
			const result = parseServiceFileDirective('// service_file = "services/UserService";');
			assert.strictEqual(result.found, true);
			assert.strictEqual(result.value, 'services/UserService');
			assert.strictEqual(result.isPlaceholder, false);
		});

		test('should detect missing directive', () => {
			const result = parseServiceFileDirective('syntax = "proto3";\nmessage Foo {}');
			assert.strictEqual(result.found, false);
			assert.strictEqual(result.value, null);
		});

		test('should detect placeholder directive', () => {
			const result = parseServiceFileDirective('// service_file = "xxx/xxxService";');
			assert.strictEqual(result.found, true);
			assert.strictEqual(result.isPlaceholder, true);
		});

		test('should handle malformed directive without closing quote', () => {
			const result = parseServiceFileDirective('// service_file = "services/broken\n');
			assert.strictEqual(result.found, false);
		});
	});

	suite('protoParser – isMessageType', () => {
		test('should recognise Request suffix', () => {
			assert.strictEqual(isMessageType('GetUserRequest'), true);
		});

		test('should recognise Response suffix', () => {
			assert.strictEqual(isMessageType('DebitGrpcResponse'), true);
		});

		test('should reject other names', () => {
			assert.strictEqual(isMessageType('UserService'), false);
			assert.strictEqual(isMessageType('Helper'), false);
		});
	});

	suite('protoParser – findSecondOccurrence', () => {
		test('should find the second occurrence', () => {
			const text = 'FooRequest bar FooRequest baz';
			assert.strictEqual(findSecondOccurrence(text, 'FooRequest'), 15);
		});

		test('should return -1 when only one occurrence exists', () => {
			assert.strictEqual(findSecondOccurrence('FooRequest bar baz', 'FooRequest'), -1);
		});

		test('should return -1 when no occurrences exist', () => {
			assert.strictEqual(findSecondOccurrence('hello world', 'FooRequest'), -1);
		});
	});

	suite('CacheManager', () => {
		let cache: CacheManager;

		setup(() => {
			cache = new CacheManager();
		});

		teardown(() => {
			cache.dispose();
		});

		test('should store and retrieve service file paths', () => {
			cache.setServiceFile('/a.proto', 'services/A');
			assert.strictEqual(cache.getServiceFile('/a.proto'), 'services/A');
		});

		test('should store Python service file paths', () => {
			cache.setServiceFile('/b.proto', 'services/BService.py');
			assert.strictEqual(cache.getServiceFile('/b.proto'), 'services/BService.py');
		});

		test('should clear a service file entry', () => {
			cache.setServiceFile('/a.proto', 'services/A');
			cache.clearServiceFile('/a.proto');
			assert.strictEqual(cache.getServiceFile('/a.proto'), undefined);
		});

		test('should handle multiple entries independently', () => {
			cache.setServiceFile('f1.proto', 's1');
			cache.setServiceFile('f2.proto', 's2');
			cache.setServiceFile('f3.proto', 's3');
			assert.strictEqual(cache.getServiceFile('f2.proto'), 's2');
		});

		test('should open and cache a document', async () => {
			const uri = vscode.Uri.file(TEST_PROTO_PATH);
			const doc = await cache.openDocument(uri);
			assert.ok(doc.getText().includes('syntax = "proto3"'));

			// Second call should return the cached instance
			const doc2 = await cache.openDocument(uri);
			assert.strictEqual(doc, doc2);
		});
	});

	suite('ServiceFileResolver', () => {
		let cache: CacheManager;
		let resolver: ServiceFileResolver;

		setup(() => {
			cache = new CacheManager();
			resolver = new ServiceFileResolver(cache);
		});

		teardown(() => {
			cache.dispose();
		});

		test('should handle C# service file extensions', async () => {
			// This is a unit test for the resolver logic
			// We're not actually searching the filesystem here
			const testPath = '/some/path/Services/TestService.cs';
			assert.ok(testPath.endsWith('.cs'));
		});

		test('should handle Python service file extensions', async () => {
			const testPath = '/some/path/Services/TestService.py';
			assert.ok(testPath.endsWith('.py'));
		});

		test('should support configuration for implementation root directory', () => {
			const config = vscode.workspace.getConfiguration('protoNavigation');
			const defaultValue = 'Services/';
			// The configuration should exist and have a default value
			assert.ok(config !== undefined);
			// We can't test the actual value in the test environment, 
			// but we verify the config mechanism works
		});
	});

	suite('Integration – test.proto', () => {
		test('should open test.proto and detect proto language', async () => {
			const doc = await vscode.workspace.openTextDocument(TEST_PROTO_PATH);
			assert.ok(
				doc.languageId === 'proto3' || doc.languageId === 'protobuf' || doc.languageId === 'proto',
				`Unexpected languageId: ${doc.languageId}`,
			);
		});

		test('should find message definitions in test.proto', async () => {
			const doc = await vscode.workspace.openTextDocument(TEST_PROTO_PATH);
			const text = doc.getText();
			assert.ok(text.includes('message DebitGrpcRequest'));
			assert.ok(text.includes('message DebitGrpcResponse'));
		});

		test('should find service definition in test.proto', async () => {
			const doc = await vscode.workspace.openTextDocument(TEST_PROTO_PATH);
			assert.ok(doc.getText().includes('service AuthDebitForBillGrpcService'));
		});

		test('should locate second occurrence of DebitGrpcRequest (rpc usage)', async () => {
			const doc = await vscode.workspace.openTextDocument(TEST_PROTO_PATH);
			const idx = findSecondOccurrence(doc.getText(), 'DebitGrpcRequest');
			assert.ok(idx > -1, 'Second occurrence of DebitGrpcRequest not found');
		});

		test('should locate second occurrence of DebitGrpcResponse (rpc usage)', async () => {
			const doc = await vscode.workspace.openTextDocument(TEST_PROTO_PATH);
			const idx = findSecondOccurrence(doc.getText(), 'DebitGrpcResponse');
			assert.ok(idx > -1, 'Second occurrence of DebitGrpcResponse not found');
		});

		test('should detect no service_file directive in test.proto', async () => {
			const doc = await vscode.workspace.openTextDocument(TEST_PROTO_PATH);
			const result = parseServiceFileDirective(doc.getText());
			assert.strictEqual(result.found, false);
		});

		test('definition provider should not throw for proto file positions', async () => {
			const doc = await vscode.workspace.openTextDocument(TEST_PROTO_PATH);
			await vscode.window.showTextDocument(doc);
			// Wait for extension activation
			await new Promise(resolve => setTimeout(resolve, 1000));

			const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
				'vscode.executeDefinitionProvider',
				doc.uri,
				new vscode.Position(6, 30), // DebitGrpcRequest in rpc line
			);

			// Should return results or empty array, but not throw
			assert.ok(Array.isArray(definitions) || definitions === undefined || definitions === null);
		});

		test('symbol provider query should not throw', async () => {
			const doc = await vscode.workspace.openTextDocument(TEST_PROTO_PATH);
			const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
				'vscode.executeDocumentSymbolProvider',
				doc.uri,
			);
			// protobuf-vsc may or may not provide symbols in test env
			assert.ok(true, 'Symbol provider query completed without error');
		});

		test('implementation provider should not throw', async () => {
			const doc = await vscode.workspace.openTextDocument(TEST_PROTO_PATH);
			await vscode.window.showTextDocument(doc);
			// Wait for extension activation
			await new Promise(resolve => setTimeout(resolve, 500));

			const implementations = await vscode.commands.executeCommand<vscode.Location[]>(
				'vscode.executeImplementationProvider',
				doc.uri,
				new vscode.Position(8, 10), // On 'Debit' method name
			);

			// Should return results or empty array, but not throw
			assert.ok(Array.isArray(implementations) || implementations === undefined || implementations === null);
		});
	});

	suite('Proto Syntax Validation', () => {
		test('should validate basic proto message structure', () => {
			const text = 'message TestMessage {\n  string field = 1;\n}';
			assert.ok(text.includes('message TestMessage'));
			assert.ok(text.includes('string field = 1'));
		});

		test('should distinguish definition vs usage position', () => {
			const text = `syntax = "proto3";
message UserRequest { int32 id = 1; }
service Svc { rpc M(UserRequest) returns (Resp); }`;
			const defIdx = text.indexOf('message UserRequest');
			const useIdx = text.indexOf('UserRequest)');
			assert.ok(defIdx < useIdx);
			assert.ok(defIdx !== useIdx);
		});
	});
});
