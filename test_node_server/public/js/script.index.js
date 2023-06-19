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

document.addEventListener("DOMContentLoaded", function (event) {
  if (axios) {
    getProductsList();
  } else {
    console.warn("AXIOS Library not loaded...");
  }
});

const responseDisplay = (res) => {
  try {
    if (res && res.resultCode > 0) {
      resCard.style.display = "block";
      resCardImg.setAttribute("src", "./assets/Success.png");
      resCardName.innerText = "Success";

      resData.innerText = res?.data || "";
      resMsg.innerText = res?.message || "";
      resObj.textContent = JSON.stringify(res, undefined, 2);
    } else if (res && res.resultCode < 0) {
      resCard.style.display = "block";
      resCardImg.setAttribute("src", "./assets/ERROR.png");
      resCardName.innerText = "Error";

      resData.innerText = res?.data || "";
      resMsg.innerText = res?.message || "";
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

const reInitialize = async () => {
  const selectedProductCode = productListSelect.value || "";
  if (selectedProductCode && selectedProductCode != "") {
    await axios
      .get(`/api/reinitialize/${selectedProductCode}`)
      .then((result) => {
        responseDisplay(result.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }
};

const fileInput = document.querySelector("#license_file_upload");
let files;
fileInput.addEventListener("change", (event) => {
  files = event.target.files;

  if (files && files.length == 1) {
    document.getElementById("selected_file_name").innerHTML = files[0].name;
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
    .post("/api/uploadLicenseFile", formData)
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

const getNewLicenseKey = () => {
  axios
    .get("/api/getKeyFil")
    .then((result) => {
      console.log({ resultData: result.data });
      responseDisplay(result.data);
      const link = document.createElement("a");
      link.href = result.data?.data?.serverFileEndPoint;
      link.download = "license_request_key.txt";
      link.click();
      link.remove();
    })
    .catch((err) => {
      console.log(err);
    });
};

const getDeviceInfoButton = (e) => {
  e.preventDefault();

  axios
    .get("/api/getMyConfig")
    .then((result) => {
      console.log({ resultData: result.data });
      // document.getElementById("json_result").textContent = JSON.stringify(result.data, undefined, 2);
      responseDisplay(result.data);
    })
    .catch((err) => {
      console.log(err);
    });
};

document.getElementById("get_device_info_btn").onclick = getDeviceInfoButton;

const getLicenseDetails = () => {
  axios
    .get("/api/gtLicenseDetails")
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

const displayLicenseDetails = (detailsObj) => {
  if (detailsObj) {
    let licenseCardHtml = ` <div class="card border-success m-3 w-75">
    <div class="card-header">
        <img src="./assets/Clean coin.png" width="40" height="40" alt=""> License
    
        <a href="#" class="btn btn-info ml-3">Check Valid?</a> |
        <a href="#" class="btn btn-primary ml-2">Renew?</a>
    </div>
    <div class="card-body">
        <h5 class="card-title text-success">Basic Details</h5>
        <span class="card-text mb-1">Product: <b>${detailsObj.included.attributes.product.productName} - ${detailsObj.included.attributes.product.productCode}</b></span> |
        <span class="card-text mb-1">Package: <b>${detailsObj.included.attributes.package}</b></span> |
        <span class="card-text mb-1">Validity: <b>${detailsObj.included.attributes.metadata.durationDays} Day(s) </b></span> |
        <span class="card-text mb-1">Price: <b>$${detailsObj.included.attributes.metadata.price}</b></span>
        <hr>
        <h5 class="card-title text-primary">Issure Details</h5>
        <span class="card-text mb-1">Company: <b>${detailsObj.included.attributes.client.companyName}</b></span> |
        <span class="card-text mb-1">Issuer: <b>${detailsObj.included.attributes.client.firstName} ${detailsObj.included.attributes.client.lastName}</b></span> |
        <span class="card-text mb-1">Email: <b>${detailsObj.included.attributes.client.emailId}</b></span> |
        <span class="card-text mb-1">Contact: <b>${detailsObj.included.attributes.client.mobile}</b></span>
        <hr>
    
        <h6 class="card-title text-danger">Validity Details</h6>
        <span class="card-text mb-1">Issued On: <b>${detailsObj.meta.issued}</b></span> |
        <span class="card-text mb-1">Expired On: <b>${detailsObj.meta.expiry}</b></span>
    
    </div>
    </div>`;

    licenseCardView.innerHTML = licenseCardHtml;
    document.getElementById("No_licenseCardView").style.display = "none";
  } else {
    licenseCardView.innerHTML = ``;
    document.getElementById("No_licenseCardView").style.display = "block";
  }
};
