# licensing-bb
 SDK to create license for any project.

#### Import Package and Initialize it.
```
const Veri5Now  = require('licensing-node-bb');

await Veri5Now.init("https://veri5now.axiomprotect.com:3011",productCode,secretId);

```

#### At the time of initialization 'Product Code' is required, This product code is auto generated code from Veri5Now when you add any new product. [Veri5Now](https://https://veri5now.axiomprotect.com:5677/sign-in)

#### - When it load it will take your system info for security purpose and for License purpose.

#### - On Init you will get Server Cert. key (Public Key) of that specific product, and it will automatically stored in your storage.

#### - After initializaltion process you can use the below functions to access other functionality


#List of Functions

| Function Name                                   | Description                            | 
| -------------------                             |--------------------                    |
| `Veri5Now.getLicenseAccessKey(callback())`       | Generate License Access Key.                | 
| `Veri5Now.getLicenseByAccessKey(LicenseAccessKey,callback())`| Get License (file) using Access Key.     | 
| `Veri5Now.getLicenseDetails(callback())`  | It will auto extract your license file and return your detail info of license and package.     | 
| `Veri5Now.uploadLicenseFile(callback())`  | Upload License file (after activation user will recive mail to download file).      |

| Response Key | Key Type | Response Data | 
|----- |------ |------ |
| `resultCode` | Integer | -1, -2, -3: These code for Error or Failur or No data found \n 1, 2, 3: These codes for Success response.|
| `data`        | Object | You will get response details in this key incase of success or null/more error details incase of Failur result codes. |
| `message`     | String | You will recive message from backend. |

## Authors

- [@Sachin Londhe](https://github.com/sachin-8055)