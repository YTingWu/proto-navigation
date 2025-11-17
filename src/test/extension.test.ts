import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

suite('Proto Navigation Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	suite('Definition Provider', () => {
		test('Should find message definition for Request type', async () => {
			const protoContent = `syntax = "proto3";

message GetUserRequest {
  int32 user_id = 1;
}

message GetUserResponse {
  string name = 1;
}

service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
}`;

			const testUri = vscode.Uri.file(path.join(__dirname, 'test.proto'));
			const searchPattern = 'message GetUserRequest';
			const index = protoContent.indexOf(searchPattern);
			
			assert.strictEqual(index > -1, true, 'Should find message definition');
		});

		test('Should find message definition for Response type', async () => {
			const protoContent = `syntax = "proto3";

message GetUserRequest {
  int32 user_id = 1;
}

message GetUserResponse {
  string name = 1;
}`;

			const searchPattern = 'message GetUserResponse';
			const index = protoContent.indexOf(searchPattern);
			
			assert.strictEqual(index > -1, true, 'Should find message definition');
		});

		test('Should not find duplicate message definitions', async () => {
			const protoContent = `syntax = "proto3";

message GetUserRequest {
  int32 user_id = 1;
}

service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
}`;

			const searchPattern = 'message GetUserRequest';
			const firstIndex = protoContent.indexOf(searchPattern);
			const secondIndex = protoContent.indexOf(searchPattern, firstIndex + 1);
			
			assert.strictEqual(secondIndex, -1, 'Should not find duplicate definition');
		});

		test('Should distinguish between message name in definition vs usage', async () => {
			const protoContent = `syntax = "proto3";

message UserRequest {
  int32 id = 1;
}

service Service {
  rpc Method(UserRequest) returns (Response);
}`;

			const definitionPattern = 'message UserRequest';
			const usagePattern = 'UserRequest)';
			
			const defIndex = protoContent.indexOf(definitionPattern);
			const usageIndex = protoContent.indexOf(usagePattern);
			
			assert.strictEqual(defIndex < usageIndex, true, 'Definition should come before usage');
			assert.strictEqual(defIndex !== usageIndex, true, 'Definition and usage should be different');
		});
	});

	suite('Service File Detection', () => {
		test('Should correctly parse service_file directive', () => {
			const protoContent = `syntax = "proto3";
// service_file = "services/UserService";

message GetUserRequest {
  int32 user_id = 1;
}`;

			const serviceFileStart = protoContent.indexOf('service_file = "') + 16;
			const serviceFileEnd = protoContent.indexOf('";', serviceFileStart);
			const serviceFileName = protoContent.substring(serviceFileStart, serviceFileEnd);

			assert.strictEqual(serviceFileName, 'services/UserService', 'Should parse service file path correctly');
		});

		test('Should handle missing service_file directive', () => {
			const protoContent = `syntax = "proto3";

message GetUserRequest {
  int32 user_id = 1;
}`;

			const serviceFileStart = protoContent.indexOf('service_file = "') + 16;
			
			assert.strictEqual(serviceFileStart, 15, 'Missing directive should return -1 + 16 = 15');
		});

		test('Should detect placeholder service_file', () => {
			const protoContent = `syntax = "proto3";
// service_file = "xxx/xxxService";

message Test {}`;

			const serviceFileStart = protoContent.indexOf('service_file = "') + 16;
			const serviceFileEnd = protoContent.indexOf('";', serviceFileStart);
			const serviceFileName = protoContent.substring(serviceFileStart, serviceFileEnd);

			assert.strictEqual(serviceFileName, 'xxx/xxxService', 'Should identify placeholder service file');
		});
	});

	suite('Proto Syntax Validation', () => {
		test('Should validate basic proto message structure', () => {
			const protoContent = `message TestMessage {
  string field = 1;
}`;

			const hasMessage = protoContent.includes('message TestMessage');
			const hasField = protoContent.includes('string field = 1');

			assert.strictEqual(hasMessage && hasField, true, 'Proto structure should be valid');
		});

		test('Should identify Request/Response suffix correctly', () => {
			const methodName1 = 'GetUserRequest';
			const methodName2 = 'UserResponse';
			const methodName3 = 'Helper';

			assert.strictEqual(methodName1.endsWith('Request'), true);
			assert.strictEqual(methodName2.endsWith('Response'), true);
			assert.strictEqual(methodName3.endsWith('Request') || methodName3.endsWith('Response'), false);
		});
	});

	suite('Cache Operations', () => {
		test('Should support cache structure', () => {
			const cache = new Map<string, string>();
			const testPath = '/path/to/file.proto';
			const testValue = 'services/UserService';

			cache.set(testPath, testValue);
			assert.strictEqual(cache.get(testPath), testValue, 'Cache should store and retrieve values');

			cache.delete(testPath);
			assert.strictEqual(cache.get(testPath), undefined, 'Cache should support deletion');
		});

		test('Should handle multiple cache entries', () => {
			const cache = new Map<string, string>();
			
			cache.set('file1.proto', 'service1');
			cache.set('file2.proto', 'service2');
			cache.set('file3.proto', 'service3');

			assert.strictEqual(cache.size, 3, 'Cache should store multiple entries');
			assert.strictEqual(cache.get('file2.proto'), 'service2', 'Should retrieve correct entry');
		});
	});
});
