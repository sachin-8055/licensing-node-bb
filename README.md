# licensing-bb
 SDK to create license for any project.

#### Import Package and Initialize it.
```
$ npm i licensing-node-bb@latest

const BBLicense  = require('licensing-node-bb');

await BBLicense.init("<BASE_URL_LICENSING_SERVER>",LICENSE_KEY);

```

#### At the time of initialization 'License Key' is required, This product code is auto generated code from BBLicense when you add any new product. [BBLicense](https://bblicense.axiomprotect.com:5677/sign-in)

#### - When it load it will take your system info for security purpose and for License purpose.

#### - On Init you will get Server Cert. key (Public Key) of that specific product, and it will automatically stored in your storage.

#### - After initializaltion process you can use the below functions to access other functionality


#List of Functions

| Function Name                                   | Description                            | 
| -------------------                             |--------------------                    |
| `BBLicense.getConfig(callback(): OPTIONAL)`       | It will return your system details for license configuration.                | 
| `BBLicense.getLicense(callback(): OPTIONAL)`| Get License (file) URL from license server to get your license file.     | 
| `BBLicense.extractLicense("File_Path",callback(): OPTIONAL)`  | File_Path: Is the License file path with file name where you uploaded. It will auto extract your license file and return your detail info of license and package.     | 

| Response Key | Key Type | Response Data | 
|----- |------ |------ |
| `resultCode` | Integer | -1: If any invalid parameter passed to SDk Functions |
| ---  | Integer | -11 : If any error occured or invalid data passed to License server |
| ---  | Integer | > 0 : Success response from SDK and Server |
| `data` | Object | You will get response details of success or null/more error details incase of Failur result codes. |
| `result` | String | You will recive message from backend. |

## Authors

- [@Sachin Londhe](https://github.com/sachin-8055)