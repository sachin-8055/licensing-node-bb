const LicenseFrontendBaseURL = "http://127.0.0.1:5678";
const LicenseBackendBaseURL = "http://127.0.0.1:3010";

const licenseCardView = document.getElementById("licenseCardView");

const productListSelect = document.getElementById("productList");

const resCard = document.getElementById("res_card");
const resCardName = document.getElementById("res_cardName");
const resCardImg = document.getElementById("res_img");

const resData = document.getElementById("res_data");
const resMsg = document.getElementById("res_msg");
const resObj = document.getElementById("res_obj");

let licenceId = "";

document.addEventListener("DOMContentLoaded", function (event) {
  if (axios) {
    // getProductsList();
  } else {
    console.warn("AXIOS Library not loaded...");
  }
});

const responseDisplay = (res) => {
  try {
    if (res && res?.resultCode > 0) {
      resCard.style.display = "block";
      resCardImg.setAttribute("src", "./assets/Success.png");
      resCardName.innerText = "Success";

      resData.innerText = res?.data || "";
      resMsg.innerText = res?.message || "";
      resObj.textContent = JSON.stringify(res, undefined, 2);
    } else if (res && res?.resultCode < 0) {
      resCard.style.display = "block";
      resCardImg.setAttribute("src", "./assets/ERROR.png");
      resCardName.innerText = "Error";

      resData.innerText = res?.data || "";
      resMsg.innerText = res?.message || "";
      resObj.textContent = JSON.stringify(res, undefined, 2);
    } else if (res) {
      resCard.style.display = "block";
      resCardImg.setAttribute("src", "./assets/Warning.png");
      resCardName.innerText = "Info";

      resData.innerText = "";
      resMsg.innerText ="";
      resObj.textContent = JSON.stringify(res, undefined, 2);
    }
  } catch (error) {
    console.log({ error });
  }
};

const getProductsList = async () => {
  await axios
    .get("/api/getListProduct")
    .then((result) => {
      let list = [];
      if (result.data.resultCode == 1) {
        list = result.data.data;
      }
      productListSelect.innerHTML = "";

      for (let i = 0; i < list.length; i++) {
        var opt = document.createElement("option");
        opt.value = list[i]["productCode"];
        opt.innerHTML = `${list[i]["productName"]} - (${list[i]["productCode"]})`;
        productListSelect.appendChild(opt);
      }
    })
    .catch((err) => {
      console.log(err);
    });
};

// const reInitialize = async () => {
//   const selectedProductCode = productListSelect.value || "";
//   if (selectedProductCode && selectedProductCode != "") {
//     await axios
//       .get(`/api/reinitialize/${selectedProductCode}`)
//       .then((result) => {
//         responseDisplay(result.data);
//       })
//       .catch((err) => {
//         console.log(err);
//       });
//   }
// };


const InitTheApp = async () => {
  try {
    
    licenseCardView.innerHTML = ``;
    
    const licenseKeyField = document.getElementById("licenseKeyField");
    if(licenseKeyField && !licenseKeyField.value.trim()==""){
 await axios
      .post(`/api/v1/sdk/init`,{licenseKey:licenseKeyField.value})
      .then((result) => {
        responseDisplay(result.data);
      })
      .catch((err) => {
        console.log(err);
      });
    } else {
      alert("Please add licence key");
    }
  } catch (error) {
    console.log(error)
  }
   
  
};


const getLicense = () => {
  axios
    .get("/api/v1/sdk/generateLicense")
    .then((result) => {
      console.log({ resultData: result.data });
      responseDisplay(result.data);
      if (result.data.resultCode == 1) {
        const LicenseDetailsObj = result.data.data;

        displayLicenseDetails(LicenseDetailsObj);
      }
    })
    .catch((err) => {
      console.log(err);
    });
};


const fileInput = document.querySelector("#license_file_upload");
let files;
fileInput.addEventListener("change", (event) => {
  files = event.target.files;

  if (files && files.length == 1) {
    
    const fName = files[0]?.name?files[0]?.name:'';
    const fExt = fName?fName.substring(fName.lastIndexOf('.')):'';
    
    if(fExt && (['.pem','pem']).includes(fExt)){

      document.getElementById("selected_file_name").innerHTML = files[0].name;
    
    } else {
      alert("Invalid File Uploaded, File should be '.pem' extention.");
      document.getElementById("license_file_upload").value = "";
    }

  } else if (files && files.length > 1) {
    alert("Please select single license file with '.pem' extention.");
    event.target.files = null;
    files = [];
  }
});

const uploadNewButton = (e) => {
  e.preventDefault();
  let formData = new FormData();
  formData.append("license", files[0]);

  axios
    .post("/api/v1/sdk/uploadLicenseFile", formData)
    .then((result) => {
      console.log({ resultData: result.data });
      responseDisplay(result.data);
    })
    .catch((err) => {
      console.log(err);
    });

  console.log("Upload New Clicked...", files[0]);
};

document.getElementById("upload_new_btn").onclick = uploadNewButton;

// const getNewLicenseKey = () => {
//   axios
//     .get("/api/getKeyFil")
//     .then((result) => {
//       console.log({ resultData: result.data });
//       responseDisplay(result.data);
//       const link = document.createElement("a");
//       link.href = result.data?.data?.serverFileEndPoint;
//       link.download = "license_request_key.txt";
//       link.click();
//       link.remove();
//     })
//     .catch((err) => {
//       console.log(err);
//     });
// };

const getSysConfig = () => {

  axios
    .get("/api/v1/sdk/getConfig")
    .then((result) => {
      console.log({ resultData: result.data });
      // document.getElementById("json_result").textContent = JSON.stringify(result.data, undefined, 2);
      responseDisplay(result.data);
    })
    .catch((err) => {
      console.log(err);
    });
};


const getLicenseDetails = () => {
  axios
    .get("/api/v1/sdk/getLicenseData")
    .then((result) => {
      console.log({ resultData: result.data });
      responseDisplay(result.data);
      if (result.data.code == 1) {
        const LicenseDetailsObj = result.data.data;

        displayLicenseDetails(LicenseDetailsObj);
      }
    })
    .catch((err) => {
      console.log(err);
    });
};

const displayLicenseDetails = (detailsObj) => {
  console.log({detailsObj})
  if (detailsObj) {
    licenceId = detailsObj.data?.id;

    let licenseCardHtml = ` <div class="card border-success m-3 w-75">
    <div class="card-header">
        <img src="./assets/Clean coin.png" width="40" height="40" alt=""> License
    
        <!--<a class="btn btn-info ml-3" id="license_validiti_check_btn" disabled>Check Valid?</a> |
        <a class="btn btn-secondary ml-2 disabled">Renew?</a>-->
    </div>
    <div class="card-body">
        <h5 class="card-title text-success">Basic Details</h5>
        <span class="card-text mb-1">Product: <b>${detailsObj.include.product.productName} - ${detailsObj.include.product.productCode}</b></span> |
        <span class="card-text mb-1">Package: <b>${detailsObj.include.package.name}</b></span> |
        <span class="card-text mb-1">Validity: <b>${detailsObj.include.package.durationDays} Day(s) </b></span> |
        <span class="card-text mb-1">Price: <b>$${detailsObj.include.package.price}</b></span>
        <hr>
        <h5 class="card-title text-primary">Issure Details</h5>
        <span class="card-text mb-1">Company: <b>${detailsObj.client.companyName}</b></span> |
        <span class="card-text mb-1">Issuer: <b>${detailsObj.client.firstName} ${detailsObj.client.lastName}</b></span> |
        <span class="card-text mb-1">Email: <b>${detailsObj.client.emailId}</b></span> |
        <span class="card-text mb-1">Contact: <b>${detailsObj.client.mobile}</b></span>
        <hr>
    
        <h6 class="card-title text-danger">Validity Details</h6>
        <span class="card-text mb-1">Issued On: <b>${detailsObj.meta.issued}</b></span> |
        <span class="card-text mb-1">Expired On: <b>${detailsObj.meta.expiry}</b></span>
    
    </div>
    </div>`;

    licenseCardView.innerHTML = licenseCardHtml;
    // document.getElementById("No_licenseCardView").style.display = "none";

    // document.getElementById("license_validiti_check_btn").onclick = checkValidity;
  } else {
    licenseCardView.innerHTML = ``;
    // document.getElementById("No_licenseCardView").style.display = "block";
  }
};

// const checkValidity = ()=>{
//   axios
//   .get(`/api/validateLicense/${licenceId}`)
//   .then((result) => {
//     console.log({ resultData: result.data });
//     responseDisplay(result.data);
    
//   })
//   .catch((err) => {
//     console.log(err);
//   });
// }
