## Features

* Navigate to message definition
* Navigate to service method definition
* Set the service file location in .proto files

> **Note:** If the file contains `import "google/protobuf/empty.proto";`, the navigation may be slower.

## Extension Settings

This extension contributes the following settings:

* `extension.setProtoServiceFile`: This command allows you to set the service file location in a .proto file. To use it, press `F1` and type `Set Proto Service File`. This will insert the following line at the second line of the current file:

```markdown
// service_file = "xxx/xxxService";
```
