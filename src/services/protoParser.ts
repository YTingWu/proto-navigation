const SERVICE_FILE_MARKER = 'service_file = "';
const PLACEHOLDER_SERVICE = 'xxx/xxxService';

export interface ServiceFileDirective {
	found: boolean;
	value: string | null;
	isPlaceholder: boolean;
}

export function parseServiceFileDirective(text: string): ServiceFileDirective {
	const lines = text.split('\n');
	
	for (const line of lines) {
		const trimmed = line.trim();
		
		// The directive can be in a comment (// service_file = "...")
		// But we want to skip lines that have multiple // or are nested comments
		const commentPrefix = '//';
		let searchLine = trimmed;
		
		// Remove leading // if present (since directive is often in comments)
		if (trimmed.startsWith(commentPrefix)) {
			searchLine = trimmed.substring(commentPrefix.length).trim();
			// If there's another //, it's a nested comment, skip it
			if (searchLine.startsWith(commentPrefix)) {
				continue;
			}
		}
		
		const startIndex = searchLine.indexOf(SERVICE_FILE_MARKER);
		if (startIndex === -1) {
			continue;
		}

		const valueStart = startIndex + SERVICE_FILE_MARKER.length;
		const valueEnd = searchLine.indexOf('";', valueStart);
		if (valueEnd < 0) {
			continue;
		}

		const value = searchLine.substring(valueStart, valueEnd);
		return {
			found: true,
			value,
			isPlaceholder: value === PLACEHOLDER_SERVICE,
		};
	}
	
	return { found: false, value: null, isPlaceholder: false };
}

export function isMessageType(word: string): boolean {
	return word.endsWith('Request') || word.endsWith('Response');
}

export function findSecondOccurrence(text: string, search: string): number {
	const firstIndex = text.indexOf(search);
	if (firstIndex === -1) {
		return -1;
	}
	return text.indexOf(search, firstIndex + 1);
}
