const ProductsModel = require("../models/products.model");
const PackageModel = require("../models/packages.model");
const PackageFeaturesModel = require("../models/packageFeatures.model");
const ClientsModel = require("../models/clients.model");
const LicenseModel = require("../models/license.model");

const fs = require("fs");
const { generateNewDateByDays } = require("../configs/CommonFunctions");

const generateNewLicenseData = async (LicenseKey) => {
  try {
    const LicenseData = await LicenseModel.findOne({
      licenseKey: LicenseKey,
    })
      .populate("request")
      .populate({
        path: "client",
        select: "_id firstName lastName emailId mobile companyName isActive createdOn",
      });

    const _licenseDevices = LicenseData?.devices;

    const requestDetails = LicenseData?.request;

    const ProductData = await ProductsModel.findOne({
      _id: requestDetails?.product,
    }).select("productName productCode description productLink platforms licenseType isActive");

    const PackageData = await PackageModel.findOne({
      _id: requestDetails?.package,
    })
      .select("product name description durationDays price features noOfDevices")
      .populate("features");

    // console.log({ LicenseData, _licenseDevices, ProductData, PackageData });

    /** Calculate Dates for License */

    let packageDays = isNaN(Number(PackageData.durationDays))
      ? 30
      : Number(PackageData.durationDays) == 0
      ? 30
      : Number(PackageData.durationDays);

    //   console.log({ AD:LicenseData?.activationDate, packageDays });
      
    let _ActivationDate = new Date(LicenseData?.activationDate);
    let _calculatedExpDate = generateNewDateByDays(_ActivationDate, packageDays);

    /** Make full License Object */

    const lic_data = {
      include: {
        product: ProductData,
        package: PackageData,
      },
      client: LicenseData?.client || {},
      meta: {
        issued: _ActivationDate,
        expiry: _calculatedExpDate,
      },
    };

    return lic_data;
    
  } catch (error) {
    console.log(error);
  }
};

module.exports = { generateNewLicenseData };
