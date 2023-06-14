
const LicenseFrontendBaseURL = "http://127.0.0.1:5678";
const LicenseBackendBaseURL = "http://127.0.0.1:3010";

document.addEventListener("DOMContentLoaded", function(event) { 
    if(axios){
        axios.get("/api/getMyConfig")
        .then((result)=>{
            console.log({resultData:result.data});
        })
        .catch(err=>{
            console.log(err);
        })
    }
  });

const fileInput = document.querySelector("#license_file_upload");
let files;
fileInput.addEventListener("change", event => {
    files = event.target.files;
    
    if(files && files.length == 1){
        document.getElementById("selected_file_name").innerHTML = files[0].name;
    } else  if(files && files.length > 1){
        alert("Please select single license file with '.pem' extention.");
        event.target.files = null;
        files = [];
    }
  });




const uploadNewButton = ((e)=>{
    e.preventDefault();

    console.log("Upload New Clicked...",files[0])
})

document.getElementById("upload_new_btn").onclick=uploadNewButton;



const getDeviceInfoButton = ((e)=>{
    e.preventDefault();

    axios.get("/api/getMyConfig")
    .then((result)=>{
        console.log({resultData:result.data});
        document.getElementById("json_result").textContent = JSON.stringify(result.data, undefined, 2);
    })
    .catch(err=>{
        console.log(err);
    })
})

document.getElementById("get_device_info_btn").onclick=getDeviceInfoButton;
