## Features

* Navigate to message definition
* Navigate to service method definition
* Set the service file location in .proto files

> **Note:** If the file contains `import "google/protobuf/empty.proto";`, the navigation may be slower.

## Setting the Service File

There are two ways to set the service file in this extension:

1. Use the `extension.setProtoServiceFile` command. This allows you to manually specify the service file.

2. Allow the extension to search for the service file within the `src/Presentation` directory and its subdirectories. This method specifically looks for files ending with `service.cs`. Please note that this method may have slightly lower performance compared to the first method due to the file searching process.

## Extension Settings

This extension contributes the following settings:

* `extension.setProtoServiceFile`: This command allows you to set the service file location in a .proto file. To use it, press `F1` and type `Set Proto Service File`. This will insert the following line at the second line of the current file:

```markdown
// service_file = "xxx/xxxService";
```
