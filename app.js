'use strict';

// Module Dependencies
const axios 			= require('axios');
var express     		= require('express');
var bodyParser  		= require('body-parser');
var errorhandler 		= require('errorhandler');
var http        		= require('http');
var path        		= require('path');
var request     		= require('request');
var routes      		= require('./routes');
var activity    		= require('./routes/activity');
var urlencodedparser 	= bodyParser.urlencoded({extended:false});
var app 				= express();
var local       		= false;

// access Heroku variables
if ( !local ) {
	var marketingCloud = {
	  authUrl: 									process.env.authUrl,
	  clientId: 								process.env.clientId,
	  clientSecret: 							process.env.clientSecret,
	  restUrl: 									process.env.restUrl,
	  appUrl: 									process.env.baseUrl,
	  promotionsListDataExtension: 				process.env.promotionsListDataExtension,
	  controlGroupsDataExtension: 				process.env.controlGroupsDataExtension,
	  updateContactsDataExtension: 				process.env.updateContactsDataExtension,
	  voucherPotsDataExtension: 				process.env.voucherPotsDataExtension,
	  insertDataExtension: 						process.env.insertDataExtension,
	  globalVoucherPot: 						process.env.globalVoucherPot,
	  promotionIncrementExtension:  			process.env.promotionIncrementExtension,
	  communicationCellDataExtension: 			process.env.communicationCellDataExtension,
	  promotionDescriptionDataExtension: 		process.env.promotionDescriptionDataExtension,
	  templateFilter: 							process.env.templateFilter 
	};
	console.dir(marketingCloud);
}

// url constants
const promotionsUrl 			= marketingCloud.restUrl + "data/v1/customobjectdata/key/" 	+ marketingCloud.promotionsListDataExtension 		+ "/rowset";
const incrementsUrl 			= marketingCloud.restUrl + "data/v1/customobjectdata/key/" 	+ marketingCloud.promotionIncrementExtension 		+ "/rowset";
const globalCodesUrl 			= marketingCloud.restUrl + "data/v1/customobjectdata/key/" 	+ marketingCloud.globalVoucherPot 					+ "/rowset";
const controlGroupsUrl 			= marketingCloud.restUrl + "data/v1/customobjectdata/key/" 	+ marketingCloud.controlGroupsDataExtension 		+ "/rowset";
const updateContactsUrl 		= marketingCloud.restUrl + "data/v1/customobjectdata/key/" 	+ marketingCloud.updateContactsDataExtension 		+ "/rowset";
const voucherPotsUrl 			= marketingCloud.restUrl + "data/v1/customobjectdata/key/" 	+ marketingCloud.voucherPotsDataExtension 			+ "/rowset";
const getCampaignsUrl	 		= marketingCloud.restUrl + "data/v1/customobjectdata/key/" 	+ marketingCloud.insertDataExtension				+ "/rowset?$filter=";
const getAllCampaigns	 		= marketingCloud.restUrl + "data/v1/customobjectdata/key/" 	+ marketingCloud.insertDataExtension				+ "/rowset";
const campaignAssociationUrl 	= marketingCloud.restUrl + "hub/v1/dataevents/key:" 		+ marketingCloud.insertDataExtension 				+ "/rowset";
const descriptionUrl 			= marketingCloud.restUrl + "hub/v1/dataevents/key:" 		+ marketingCloud.promotionDescriptionDataExtension 	+ "/rowset";
const communicationCellUrl 		= marketingCloud.restUrl + "hub/v1/dataevents/key:" 		+ marketingCloud.communicationCellDataExtension 	+ "/rowset";
const updateIncrementsUrl 		= marketingCloud.restUrl + "hub/v1/dataevents/key:" 		+ marketingCloud.promotionIncrementExtension 		+ "/rowset";
const templatesUrl 				= marketingCloud.restUrl + "asset/v1/content/assets/query";
const contextUrl = marketingCloud.restUrl + "platform/v1/tokenContext";

// json template payload
const templatePayload = {
    "page":
    {
        "page":1,
        "pageSize":1000
    },

    "query":
    {
        "leftOperand":
        {
            "property":"name",
            "simpleOperator":"contains",
            "value": marketingCloud.templateFilter
        },
        "logicalOperator":"AND",
        "rightOperand":
        {
            "property":"assetType.name",
            "simpleOperator":"equal",
            "value":"templatebasedemail"
        }
    },

    "sort":
    [
        { "property":"name", "direction":"ASC" }
    ],

    "fields":
    [
        "name"
    ]
};

// Configure Express master
app.set('port', process.env.PORT || 3000);
app.use(bodyParser.raw({type: 'application/jwt'}));

app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

// Express in Development Mode
if ('development' == app.get('env')) {
	app.use(errorhandler());
}

const getOauth2Token = () => new Promise((resolve, reject) => {
	axios({
		method: 'post',
		url: marketingCloud.authUrl,
		data:{
			"grant_type": "client_credentials",
			"client_id": marketingCloud.clientId,
			"client_secret": marketingCloud.clientSecret
		}
	})
	.then(function (oauthResponse) {
		console.dir('Bearer '.concat(oauthResponse.data.access_token));
		return resolve('Bearer '.concat(oauthResponse.data.access_token));
	})
	.catch(function (error) {
		console.dir("Error getting Oauth Token");
		return reject(error);
	});
});

const validateTokenContext = (fuel2Token) => new Promise((resolve, reject) => {

	console.dir("The context endpoint is: ");

	console.dir(contextUrl);

	console.dir("The fuel token passed to this function is: ");

	console.dir(fuel2Token);

	axios({
		method: 'get',
		url: contextUrl,
		headers: {'Authorization': 'Bearer '.concat(fuel2Token)}
	})
	.then(function (tokenResponse) {
		console.dir('Token Response');
		console.dir(tokenResponse);
		return resolve(tokenResponse);
	})
	.catch(function (error) {
		console.dir("Error getting token context response");
		console.dir(error);
		return reject(error);
	});
});

const getIncrements = () => new Promise((resolve, reject) => {
	getOauth2Token().then((tokenResponse) => {

		axios.get(incrementsUrl, { 
			headers: { 
				Authorization: tokenResponse
			}
		})
		.then(response => {
			// If request is good...
			console.dir(response.data.items[0].values);
			return resolve(response.data.items[0].values);
		})
		.catch((error) => {
		    console.dir("Error getting increments");
		    return reject(error);
		});
	})
});

const saveToDataExtension = (targetUrl, payload, key, dataType, keyName) => new Promise((resolve, reject) => {

	console.dir("Target URL:");
	console.dir(targetUrl);
	console.dir("Payload:");
	console.dir(payload);
	console.dir("Key:");
	console.dir(key);
	console.dir("Type:");
	console.dir(dataType);
	console.dir("Key name:");
	console.dir(keyName);

	if ( dataType == "cpa" ) {

		var insertPayload = [{
	        "keys": {
	            [keyName]: (parseInt(key) + 1)
	        },
	        "values": payload
    	}];
		
		console.dir(insertPayload);

		getOauth2Token().then((tokenResponse) => {
		   	axios({
				method: 'post',
				url: targetUrl,
				headers: {'Authorization': tokenResponse},
				data: insertPayload
			})
			.then(function (response) {
				console.dir(response.data);
				return resolve(response.data);
			})
			.catch(function (error) {
				console.dir(error);
				return reject(error);
			});
		})	
	} else if ( dataType == "communication_cell") {
		var insertPayload = [{
	        "keys": {
	            [keyName]: (parseInt(key) + 1)
	        },
	        "values": payload.control,

    	},
    	{
	        "keys": {
	            [keyName]: (parseInt(key) + 2)
	        },
	        "values": payload.not_control,
	        
    	}];
    	console.dir(insertPayload);

		getOauth2Token().then((tokenResponse) => {
		   	axios({
				method: 'post',
				url: targetUrl,
				headers: {'Authorization': tokenResponse},
				data: insertPayload
			})
			.then(function (response) {
				console.dir(response.data);
				return resolve(response.data);
			})
			.catch(function (error) {
				console.dir(error);
				return reject(error);
			});
		})
	} else if ( dataType == "promotion_description") {

		var insertPayload = [];

		for ( var i = 1; i <= Object.keys(payload.promotions).length; i++ ) {
			insertPayload.push({
		        "keys": {
		            [keyName]: (parseInt(key) + i)
		        },
		        "values": payload.promotions["promotion_" + i],

	    	});
		}
		console.dir("Promo desc data: ");
		console.dir(insertPayload);

		getOauth2Token().then((tokenResponse) => {
		   	axios({
				method: 'post',
				url: targetUrl,
				headers: {'Authorization': tokenResponse},
				data: insertPayload
			})
			.then(function (response) {
				console.dir(response.data);
				return resolve(response.data);
			})
			.catch(function (error) {
				console.dir(error);
				return reject(error);
			});
		})
	}
});

const updateIncrements = (targetUrl, promotionObject, communicationCellObject, mcUniquePromotionObject, numberOfCodes) => new Promise((resolve, reject) => {

	console.dir("Target URL:");
	console.dir(targetUrl);

	console.dir("cpa Object Response:");
	console.dir(promotionObject[0].keys.promotion_key);

	console.dir("comm Object Response:");
	console.dir(communicationCellObject[1].keys.communication_cell_id);

	console.dir("number of codes");
	console.dir(numberOfCodes);

	console.dir("pro desc Object Response:");
	console.dir(mcUniquePromotionObject);

	var totalCodesForIncrement = numberOfCodes.instore_codes + numberOfCodes.online_codes;

	var mcInc = mcUniquePromotionObject[(parseInt(totalCodesForIncrement) - 1)].keys.mc_unique_promotion_id;
	var updatedIncrementObject = {};
	updatedIncrementObject.mc_unique_promotion_id_increment = parseInt(mcInc) + 1;
	updatedIncrementObject.communication_cell_code_id_increment = parseInt(communicationCellObject[1].keys.communication_cell_id) + 1;
	updatedIncrementObject.promotion_key = parseInt(promotionObject[0].keys.promotion_key) + 1;

	console.dir(updatedIncrementObject);

	var insertPayload = [{
        "keys": {
            "increment_key": 1
        },
        "values": updatedIncrementObject
	}];
		
	console.dir(insertPayload);

	getOauth2Token().then((tokenResponse) => {
	   	axios({
			method: 'post',
			url: targetUrl,
			headers: {'Authorization': tokenResponse},
			data: insertPayload
		})
		.then(function (response) {
			console.dir(response.data);
			return resolve(response.data);
		})
		.catch(function (error) {
			console.dir(error);
			return reject(error);
		});
	})	
	
});

//Fetch increment values
app.get("/dataextension/lookup/increments/:fuel2Token", (req, res, next) => {

	console.dir("The fuel token sent is: ");
	console.dir(req.params.fuel2Token);

	var token = req.params.fuel2Token;

	if ( token ) {

		validateTokenContext(token).then((tokenContext) => {

			getOauth2Token().then((tokenResponse) => {

				axios.get(incrementsUrl, { 
					headers: { 
						Authorization: tokenResponse
					}
				})
				.then(response => {
					// If request is good... 
					res.json(response.data);
				})
				.catch((error) => {
				    console.dir("Error getting increments");
				    console.dir(error);
				});
			})				
		})
	}
});

//Fetch rows from promotions data extension
app.get("/dataextension/lookup/promotions/:fuel2Token", (req, res, next) => {

	console.dir("The fuel token sent is: ");
	console.dir(req.params.fuel2Token);
	var token = req.params.fuel2Token;

	if ( token ) {

		validateTokenContext(token).then((tokenContext) => {

			getOauth2Token().then((tokenResponse) => {

				axios.get(promotionsUrl, { 
					headers: { 
						Authorization: tokenResponse
					}
				})
				.then(response => {
					// If request is good... 
					res.json(response.data);
				})
				.catch((error) => {
				    console.dir("Error getting promotions");
				    console.dir(error);
				});
			})					
		})
	}	
});

//Fetch rows from promotions data extension
app.get("/dataextension/lookup/campaigns/:fuel2Token", (req, res, next) => {

	console.dir("The fuel token sent is: ");
	console.dir(req.params.fuel2Token);

	var token = req.params.fuel2Token;

	if ( token ) {

		validateTokenContext(token).then((tokenContext) => {

			getOauth2Token().then((tokenResponse) => {

				axios.get(getAllCampaigns, { 
					headers: { 
						Authorization: tokenResponse
					}
				})
				.then(response => {
					// If request is good... 
					res.json(response.data);
				})
				.catch((error) => {
				    console.dir("Error getting promotions");
				    console.dir(error);
				});
			})					
		})
	}		
});

//Fetch rows from promotions data extension
app.get("/dataextension/lookup/globalcodes/:fuel2Token", (req, res, next) => {

	console.dir("The fuel token sent is: ");
	console.dir(req.params.fuel2Token);

	var token = req.params.fuel2Token;

	if ( token ) {

		validateTokenContext(token).then((tokenContext) => {

			getOauth2Token().then((tokenResponse) => {

				axios.get(globalCodesUrl, { 
					headers: { 
						Authorization: tokenResponse
					}
				})
				.then(response => {
					// If request is good... 
					res.json(response.data);
				})
				.catch((error) => {
				    console.dir("Error getting global code");
				    console.dir(error);
				});
			})						
		}).catch((error)  => {
     		console.log("Not Authorised request made.");
     		res.send("Not Authorised");
     	})
    }
});

//Fetch rows from control group data extension
app.get("/dataextension/lookup/controlgroups/:fuel2Token", (req, res, next) => {

	console.dir("The fuel token sent is: ");
	console.dir(req.params.fuel2Token);

	var token = req.params.fuel2Token;

	if ( token ) {

		validateTokenContext(token).then((tokenContext) => {

			getOauth2Token().then((tokenResponse) => {

				axios.get(controlGroupsUrl, { 
					headers: { 
						Authorization: tokenResponse
					}
				})
				.then(response => {
					// If request is good... 
					res.json(response.data);
				})
				.catch((error) => {
				    console.dir("Error getting control groups");
				    console.dir(error);
				});
			})					
		}).catch((error)  => {
     		console.log("Not Authorised request made.");
     		res.send("Not Authorised");
     	})
	}
});

//Fetch rows from update contacts data extension
app.get("/dataextension/lookup/updatecontacts/:fuel2Token", (req, res, next) => {

	console.dir("The fuel token sent is: ");
	console.dir(req.params.fuel2Token);

	var token = req.params.fuel2Token;

	if ( token ) {

		validateTokenContext(token).then((tokenContext) => {

			getOauth2Token().then((tokenResponse) => {

				axios.get(updateContactsUrl, { 
					headers: { 
						Authorization: tokenResponse
					}
				})
				.then(response => {
					// If request is good... 
					res.json(response.data);
				})
				.catch((error) => {
				    console.dir("Error getting update contacts");
				    console.dir(error);
				});
			})				
		}).catch((error)  => {
     		console.log("Not Authorised request made.");
     		res.send("Not Authorised");
     	})
	}
});

//Fetch rows from voucher data extension
app.get("/dataextension/lookup/voucherpots/:fuel2Token", (req, res, next) => {

	console.dir("The fuel token sent is: ");
	console.dir(req.params.fuel2Token);

	var token = req.params.fuel2Token;

	if ( token ) {

		validateTokenContext(token).then((tokenContext) => {

			getOauth2Token().then((tokenResponse) => {

				axios.get(voucherPotsUrl, { 
					headers: { 
						Authorization: tokenResponse
					}
				})
				.then(response => {
					// If request is good... 
					res.json(response.data);
				})
				.catch((error) => {
				    console.dir("Error getting voucher pots");
				    console.dir(error);
				});
			})					
		}).catch((error)  => {
     		console.log("Not Authorised request made.");
     		res.send("Not Authorised");
     	})
	}
});

//Fetch email templates
app.get("/dataextension/lookup/templates/:fuel2Token", (req, res, next) => {

	console.dir("The fuel token sent is: ");
	console.dir(req.params.fuel2Token);

	var token = req.params.fuel2Token;

	if ( token ) {

		validateTokenContext(token).then((tokenContext) => {

			getOauth2Token().then((tokenResponse) => {

			   	axios({
					method: 'post',
					url: templatesUrl,
					headers: {'Authorization': tokenResponse},
					data: templatePayload
				})
				.then(function (response) {
					//console.dir(response.data);
					res.json(response.data);
				})
				.catch(function (error) {
					console.dir(error);
					return error;
				});
			})					
		}).catch((error)  => {
     		console.log("Not Authorised request made.");
     		res.send("Not Authorised");
     	})
	}
});

function buildAssociationPayload(payload, incrementData, numberOfCodes) {
	var campaignPromotionAssociationData = {};
	for ( var i = 0; i < payload.length; i++ ) {
		//console.dir("Step is: " + payload[i].step + ", Key is: " + payload[i].key + ", Value is: " + payload[i].value + ", Type is: " + payload[i].type);
		
		if ( campaignPromotionAssociationData[payload[i].key] == "email_template" ) {
			campaignPromotionAssociationData[payload[i].key] = payload[i].value;
		} else {
			campaignPromotionAssociationData[payload[i].key] = decodeURIComponent(payload[i].value);
		}
	}
	console.dir("building association payload")
	console.dir(campaignPromotionAssociationData);

	var mcUniqueIdForAssociation = incrementData.mc_unique_promotion_id_increment;
	var commCellForAssociation = incrementData.communication_cell_code_id_increment;

	console.dir("mc inc in desc build is:");
	console.dir(mcUniqueIdForAssociation);
	console.dir("comm cell inc in desc build is:");
	console.dir(commCellForAssociation);
	console.dir("no of codes:");
	console.dir(numberOfCodes);

	var nextMcUniqueIdIncrement = parseInt(mcUniqueIdForAssociation) + 1;

	if ( numberOfCodes.online_codes > 0 ) {
		for ( var i = 1; i <= numberOfCodes.online_codes; i++ ) {
			campaignPromotionAssociationData["mc_id_" + i] = nextMcUniqueIdIncrement;
			nextMcUniqueIdIncrement++;
		}
	}

	if ( numberOfCodes.instore_codes > 0 ) {
		for ( var i = 1; i <= numberOfCodes.instore_codes; i++ ) {
			campaignPromotionAssociationData["mc_id_" + (5 + i)] = nextMcUniqueIdIncrement;
			nextMcUniqueIdIncrement++;
		}
	}

	campaignPromotionAssociationData["communication_cell_id"] = parseInt(commCellForAssociation) + 1;
	campaignPromotionAssociationData["communication_cell_id_control"] = parseInt(commCellForAssociation) + 2;

	return campaignPromotionAssociationData;
}

function odbcDateTimeEnforcement(dateString) {

	if ( dateString.indexOf(":") > 0 ) {
		var splitComp = dateString.split(" ");
		var newDate = splitComp[0].split("/").reverse().join("-");
	 	return newDate + " " + splitComp[1];
	} else {
		if ( !dateString || dateString == "" ) {
			return "";
		} else {
			return dateString.split("/").reverse().join("-") + " 00:00:00";
		}
	}
}

function buildCommunicationCellPayload(payload) {
	var communicationCellData = {
			"not_control": {
		    	"cell_code"					: payload["cell_code"],
		    	"cell_name"					: payload["cell_name"],
		        "campaign_name"				: payload["campaign_name"],
		        "campaign_id"				: payload["campaign_id"],
		        "campaign_code"				: payload["campaign_code"],
		        "cell_type"					: "1",
		        "channel"					: "2",
		        "is_putput_flag"			: "1"				
			},
			"control": {
		    	"cell_code"					: payload["cell_code"],
		    	"cell_name"					: payload["cell_name"],
		        "campaign_name"				: payload["campaign_name"],
		        "campaign_id"				: payload["campaign_id"],
		        "campaign_code"				: payload["campaign_code"],
		        "cell_type"					: "2",
		        "channel"					: "2",
		        "is_putput_flag"			: "0"				
			}
	};
	console.dir(communicationCellData);
	return communicationCellData;
}
function buildPromotionDescriptionPayload(payload, incrementData, numberOfCodes) {
	console.dir("payload is:");
	console.dir(payload);
	console.dir("increment payload");
	console.dir(incrementData);
	console.dir("number of codes: ");
	console.dir(numberOfCodes);

	var onlineTicker = 1;
	var instoreTicker = 1;
	var ticker = 1;
	var commCellForPromo = incrementData.communication_cell_code_id_increment;

	console.dir("comm cell id in desc build is:");
	console.dir(commCellForPromo)

	var promotionDescriptionData = {};
	
	promotionDescriptionData["promotions"] = {};

	var totalCodesNeeded = numberOfCodes.instore_codes + numberOfCodes.online_codes;

	for ( var i = 1; i <= totalCodesNeeded; i++ ) {
		var promotionArrayKey = "promotion_" + ticker;
		console.dir("Promo ticker is promotion_" + ticker);
		console.dir("I is " + i);

		if ( payload.promotionType == "online" || payload.promotionType == "online_instore" ) {

			console.dir("Promotion Type is " + payload.promotionType);
			console.dir("in online mode");
			if ( payload["global_code_" + onlineTicker] != "no-code" || payload["unique_code_" + onlineTicker] != "no-code" ) {
				console.dir("ADDING ONLINE DATA");
				promotionDescriptionData.promotions[promotionArrayKey] = {};
				promotionDescriptionData.promotions[promotionArrayKey]["offer_channel"] 		= "Online";
				promotionDescriptionData.promotions[promotionArrayKey]["offer_description"] 	= payload.campaign_name;
				promotionDescriptionData.promotions[promotionArrayKey]["ts_and_cs"] 			= "-";
				promotionDescriptionData.promotions[promotionArrayKey]["print_at_till_flag"] 	= payload.print_at_till_online;
				promotionDescriptionData.promotions[promotionArrayKey]["instant_win_flag"] 		= payload.instant_win_online;
				promotionDescriptionData.promotions[promotionArrayKey]["offer_medium"] 			= payload.offer_medium_online;
				promotionDescriptionData.promotions[promotionArrayKey]["communication_cell_id"] = parseInt(commCellForPromo) + 1;
				if ( payload.onlinePromotionType == "global" ) {
					promotionDescriptionData.promotions[promotionArrayKey]["barcode"] 				= payload["global_code_" + onlineTicker];
					promotionDescriptionData.promotions[promotionArrayKey]["promotion_id"] 			= payload["global_code_" + onlineTicker +"_promo_id"];
					promotionDescriptionData.promotions[promotionArrayKey]["promotion_group_id"] 	= payload["global_code_" + onlineTicker +"_promo_group_id"];
					promotionDescriptionData.promotions[promotionArrayKey]["valid_from_datetime"] 	= odbcDateTimeEnforcement(payload["global_code_" + onlineTicker +"_valid_from"]);
					promotionDescriptionData.promotions[promotionArrayKey]["valid_to_datetime"] 	= odbcDateTimeEnforcement(payload["global_code_" + onlineTicker +"_valid_to"]);
					promotionDescriptionData.promotions[promotionArrayKey]["visiblefrom"] 			= odbcDateTimeEnforcement(payload["global_code_" + onlineTicker +"_valid_from"]);
					promotionDescriptionData.promotions[promotionArrayKey]["visibleto"] 			= odbcDateTimeEnforcement(payload["global_code_" + onlineTicker +"_valid_to"]);
				} else if (payload.onlinePromotionType == "unique" ) {
					promotionDescriptionData.promotions[promotionArrayKey]["barcode"] 				= "-";
					promotionDescriptionData.promotions[promotionArrayKey]["promotion_id"] 			= payload["unique_code_" + onlineTicker +"_promo_id"];
					promotionDescriptionData.promotions[promotionArrayKey]["promotion_group_id"] 	= payload["unique_code_" + onlineTicker +"_promo_group_id"];
				}
				onlineTicker++;
				ticker++;
			}
		}
		if ( payload.promotionType == "instore" || payload.promotionType == "online_instore" || payload.promotionType == "nocode" ) {
			var promotionArrayKey = "promotion_" + ticker;
			console.dir("Promo ticker is promotion_" + ticker);
			console.dir("Promotion Type is " + payload.promotionType);
			console.dir("In instore mode");
			if ( payload["instore_code_" + instoreTicker] != "no-code" ) {
				console.dir("ADDING INSTORE DATA");
				promotionDescriptionData.promotions[promotionArrayKey] = {};
				promotionDescriptionData.promotions[promotionArrayKey]["offer_channel"] 				= "Instore";
				promotionDescriptionData.promotions[promotionArrayKey]["offer_description"] 			= payload.campaign_name;
				promotionDescriptionData.promotions[promotionArrayKey]["ts_and_cs"] 					= "-";
				promotionDescriptionData.promotions[promotionArrayKey]["barcode"] 						= payload["instore_code_" + instoreTicker];
				promotionDescriptionData.promotions[promotionArrayKey]["promotion_id"]					= payload["instore_code_" + instoreTicker +"_promo_id"];
				promotionDescriptionData.promotions[promotionArrayKey]["promotion_group_id"]			= payload["instore_code_" + instoreTicker +"_promo_group_id"];
				promotionDescriptionData.promotions[promotionArrayKey]["valid_from_datetime"] 			= odbcDateTimeEnforcement(payload["instore_code_" + instoreTicker +"_valid_from"]);
				promotionDescriptionData.promotions[promotionArrayKey]["valid_to_datetime"] 			= odbcDateTimeEnforcement(payload["instore_code_" + instoreTicker +"_valid_to"]);
				promotionDescriptionData.promotions[promotionArrayKey]["visiblefrom"]					= odbcDateTimeEnforcement(payload["instore_code_" + instoreTicker +"_valid_from"]);
				promotionDescriptionData.promotions[promotionArrayKey]["visibleto"] 					= odbcDateTimeEnforcement(payload["instore_code_" + instoreTicker +"_valid_to"]);
				promotionDescriptionData.promotions[promotionArrayKey]["number_of_redemptions_allowed"] = payload["instore_code_" + instoreTicker +"_redemptions"];
				promotionDescriptionData.promotions[promotionArrayKey]["print_at_till_flag"] 			= payload.print_at_till_instore;
				promotionDescriptionData.promotions[promotionArrayKey]["instant_win_flag"] 				= payload.instant_win_instore;
				promotionDescriptionData.promotions[promotionArrayKey]["offer_medium"] 					= payload.offer_medium_instore;
				promotionDescriptionData.promotions[promotionArrayKey]["communication_cell_id"] 		= parseInt(commCellForPromo) + 1;
				instoreTicker++;
				ticker++;
			}
		}
	}

	console.dir(promotionDescriptionData);

	return promotionDescriptionData;
}

function countCodes(payload) {

	var cpaData = {};
	for ( var i = 0; i < payload.length; i++ ) {
		//console.dir("Step is: " + payload[i].step + ", Key is: " + payload[i].key + ", Value is: " + payload[i].value + ", Type is: " + payload[i].type);
		cpaData[payload[i].key] = payload[i].value;
	}

	console.dir("payload passed to count");
	console.dir(cpaData);

	console.dir("get code as example");
	console.dir(cpaData.global_code_1);

	console.dir("get code as example dynamically");
	console.dir(cpaData["global_code_1"]);

	var globalCodes = 0;
	var uniqueCodes = 0;
	var instoreCodes = 0;
	var totalCodes = 0;

	for ( var i = 1; i <= 5; i++) {
		if ( cpaData["global_code_" + i] != "no-code" ) {
			globalCodes++;
		}
	}
	for ( var i = 1; i <= 5; i++) {
		if ( cpaData["unique_code_" + i] != "no-code" ) {
			uniqueCodes++;
		}
	}
	for ( var i = 1; i <= 5; i++) {
		if ( cpaData["instore_code_" + i] != "no-code" ) {
			instoreCodes++;
		}
	}
	console.dir("num of codes:");
	console.dir(parseInt(globalCodes) + parseInt(uniqueCodes) + parseInt(instoreCodes));
	var requiredOnlineCodes = parseInt(globalCodes) + parseInt(uniqueCodes);
	var countPayload = {
		"online_codes": requiredOnlineCodes,
		"instore_codes": parseInt(instoreCodes)
	}
	return countPayload;
}

async function buildAndSend(payload) {
	try {
		const numberOfCodes = await countCodes(payload);
		const incrementData = await getIncrements();
		const associationPayload = await buildAssociationPayload(payload, incrementData, numberOfCodes);
		const communicationCellPayload = await buildCommunicationCellPayload(associationPayload);
		const promotionDescriptionPayload = await buildPromotionDescriptionPayload(associationPayload, incrementData, numberOfCodes);
		const promotionObject = await saveToDataExtension(campaignAssociationUrl, associationPayload, incrementData.promotion_key, "cpa", "promotion_key");
		const communicationCellObject = await saveToDataExtension(communicationCellUrl, communicationCellPayload, incrementData.communication_cell_code_id_increment, "communication_cell", "communication_cell_id");
		const mcUniquePromotionObject = await saveToDataExtension(descriptionUrl, promotionDescriptionPayload, incrementData.mc_unique_promotion_id_increment, "promotion_description", "mc_unique_promotion_id");
		await updateIncrements(updateIncrementsUrl, promotionObject, communicationCellObject, mcUniquePromotionObject, numberOfCodes);
		return associationPayload;
	} catch(err) {
		console.dir(err);
	}
}

async function sendBackPayload(payload) {
	try {
		const getIncrementsForSendback = await getIncrements();
		var sendBackPromotionKey = parseInt(getIncrementsForSendback.promotion_key) + 1;
		const fullAssociationPayload = await buildAndSend(payload);
		return sendBackPromotionKey;
	} catch(err) {
		console.dir(err);
	}

}
// insert data into data extension
app.post('/dataextension/add/:fuel2Token', async function (req, res){ 
	console.dir("The fuel token sent is: ");
	console.dir(req.params.fuel2Token);
	console.dir("Dump request body");
	console.dir(req.body);

	var token = req.params.fuel2Token;

	if ( token ) {

		const tokenContextResponse  =  await validateTokenContext(token);
		console.dir("The returned user id is:");
		console.dir(tokenContextResponse.data.user);

		if ( tokenContextResponse.data.user ) {
			try {
				const returnedPayload = await sendBackPayload(req.body)
				res.send(JSON.stringify(returnedPayload));
			} catch(err) {
				console.dir(err);
			}			
		}
	}
});

function getDateString(dateOffSetted) {
	let date_ob = dateOffSetted;
	let date = ("0" + date_ob.getDate()).slice(-2);
	let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
	let year = date_ob.getFullYear();
	let hours = date_ob.getHours();
	let minutes = date_ob.getMinutes();
    let seconds = date_ob.getSeconds();
    if ( minutes < 10 ) {
        minutes = "0" + minutes;
    }
    if ( seconds < 10 ) {
        seconds = "0" + seconds;
    }
	
	let dateString = year + "/" + month + "/" + date + " " + hours + ":" + minutes + ":" + seconds;	
	return dateString;
}

function getDateAndOffSet() {
    var dt = new Date();
    //console.log(dt); // Gives Tue Mar 22 2016 09:30:00 GMT+0530 (IST)

    dt.setTime(dt.getTime()+dt.getTimezoneOffset()*60*1000);
    //console.log(dt); // Gives Tue Mar 22 2016 04:00:00 GMT+0530 (IST)

    var offset = -300; //Timezone offset for EST in minutes.
    var estDate = new Date(dt.getTime() + offset*60*1000);
    console.log(estDate);
    return estDate; 
}

async function setLive(existingKey) {

	console.dir("set live key is");
	console.dir(existingKey);
	var lookupCampaigns = getCampaignsUrl + "promotion_key%20eq%20'" + existingKey + "'";
	console.dir("Looking up CPA's URL");
	console.dir(lookupCampaigns);

	var currentDateTimeStamp = getDateString(getDateAndOffSet());
	console.dir("The current DT stamp is");
	console.dir(currentDateTimeStamp);

	getOauth2Token().then((tokenResponse) => {

		console.dir("perform CPA lookup")
		axios.get(lookupCampaigns, { 
			headers: { 
				Authorization: tokenResponse
			}
		})
		.then(response => {
			// If request is good... 
			//res.json(response.data);
			console.dir("Response from CPA lookup get");
			console.dir(response.data.items);
			//console.dir(response.data.items[0].keys);
			//console.dir(response.data.items[0].values);

			for ( var v = 1; v <= 10; v++ ) {
				if ( response.data.items[0].values["mc_id_" + v] != "-" ) {
					// update each promo desc
					console.dir("found a match");

					var updatePromoPayload = [{
				        "keys": {
				            "MC_UNIQUE_PROMOTION_ID": response.data.items[0].values["mc_id_" + v]
				        },
				        "values": {
				        	"SENT": true,
				        	"DATE_ADDED": currentDateTimeStamp
				        }
					}];
						
					console.dir(updatePromoPayload);

					getOauth2Token().then((tokenResponse) => {
					   	axios({
							method: 'post',
							url: descriptionUrl,
							headers: {'Authorization': tokenResponse},
							data: updatePromoPayload
						})
						.then(function (response) {
							console.dir("Promotion POST success");
							console.dir(response.data);
							//return resolve(response.data);
						})
						.catch(function (error) {
							console.dir("Promotion POST failure");
							console.dir(error);
							//return reject(error);
						});
					})	

				}
			}

			var updateCommPayload = [{
		        "keys": {
		            "COMMUNICATION_CELL_ID": response.data.items[0].values.communication_cell_id
		        },
		        "values": {
		        	"SENT": true,
		        	"BASE_CONTACT_DATE": currentDateTimeStamp
		        }
			}];
				
			console.dir(updateCommPayload);

			getOauth2Token().then((tokenResponse) => {
			   	axios({
					method: 'post',
					url: communicationCellUrl,
					headers: {'Authorization': tokenResponse},
					data: updateCommPayload
				})
				.then(function (response) {
					console.dir(response.data);
					//return resolve(response.data);
				})
				.catch(function (error) {
					console.dir(error);
					//return reject(error);
				});
			})

			var updateCommControlPayload = [{
		        "keys": {
		            "COMMUNICATION_CELL_ID": response.data.items[0].values.communication_cell_id_control
		        },
		        "values": {
		        	"SENT": true,
		        	"BASE_CONTACT_DATE": currentDateTimeStamp
		        }
			}];
				
			console.dir(updateCommPayload);

			getOauth2Token().then((tokenResponse) => {
			   	axios({
					method: 'post',
					url: communicationCellUrl,
					headers: {'Authorization': tokenResponse},
					data: updateCommControlPayload
				})
				.then(function (response) {
					console.dir(response.data);
					//return resolve(response.data);
				})
				.catch(function (error) {
					console.dir(error);
					//return reject(error);
				});
			})

			var updateCpaPayload = [{
		        "keys": {
		            "promotion_key": response.data.items[0].keys.promotion_key
		        },
		        "values": {
		        	"sent_to_optima": true,
		        	"date_edited": currentDateTimeStamp
		        }
			}];
				
			console.dir(updateCpaPayload);

			getOauth2Token().then((tokenResponse) => {
			   	axios({
					method: 'post',
					url: campaignAssociationUrl,
					headers: {'Authorization': tokenResponse},
					data: updateCpaPayload
				})
				.then(function (response) {
					console.dir(response.data);
					//return resolve(response.data);
				})
				.catch(function (error) {
					console.dir(error);
					//return reject(error);
				});
			})

			return response.data;	

		})
		.catch((error) => {
		    console.dir("Error getting promotions");
		    console.dir(error);
		});
	})	
	
}

async function updateExistingPromotion(existingKey, payloadBody) {

	console.dir("Payload Body for update is");
	console.dir(payloadBody[0]);

	var lookupCampaigns = getCampaignsUrl + "promotion_key%20eq%20'" + existingKey + "'"
	console.dir(lookupCampaigns);

	var currentDateTimeStamp = getDateString(getDateAndOffSet());

	getOauth2Token().then((tokenResponse) => {

		axios.get(lookupCampaigns, { 
			headers: { 
				Authorization: tokenResponse
			}
		})
		.then(response => {
			// If request is good... 
			//res.json(response.data);
			console.dir(response.data.items[0].keys);
			console.dir(response.data.items[0].values);

			for ( var v = 1; v <= 10; v++ ) {
				if ( response.data.items[0].values["mc_id_" + v] =! "-" ) {

					if ( v >= 1 && v <= 5 ) {

						// these are online codes

						if ( payloadBody[0].onlinePromotionType == "global" ) {

							// update each promo desc
							var updatePromoPayload = [{
						        "keys": {
						            "MC_UNIQUE_PROMOTION_ID": response.data.items[0].values["mc_id_" + v]
						        },
						        "values": {
						        	"SENT": false,
						        	"DATE_ADDED": currentDateTimeStamp,
						        	"PROMOTION_ID": payloadBody[0]["global_code_" + v + "_promo_id"],
						        	"PROMOTION_GROUP_ID": payloadBody[0]["global_code_" + v + "_promo_group_id"],
						        	"PRINT_AT_TILL": payloadBody[0]["print_at_till_online"],
						        	"INSTANT_WIN": payloadBody[0]["instant_win_online"],
						        	"VALID_FROM_DATETIME": payloadBody[0]["global_code_1_valid_from"],
						        	"VALID_TO_DATETIME": payloadBody[0]["global_code_" + v + "_valid_to"],
						        	"VISIBLE_FROM_DATETIME": payloadBody[0]["global_code_1_valid_from"],
						        	"VISIBLE_TO_DATETIME": payloadBody[0]["global_code_" + v + "_valid_to"],
						        	"OFFER_DESCRIPTION": payloadBody[0]["campaign_name"],
						        	"OFFER_CHANNEL": payloadBody[0]["offer_medium_online"]
						        }
							}];
								
							console.dir(updatePromoPayload);

							getOauth2Token().then((tokenResponse) => {
							   	axios({
									method: 'post',
									url: descriptionUrl,
									headers: {'Authorization': tokenResponse},
									data: updatePromoPayload
								})
								.then(function (response) {
									console.dir(response.data);
									//return resolve(response.data);
								})
								.catch(function (error) {
									console.dir(error);
									//return reject(error);
								});
							})	

						} else if ( payloadBody[0].onlinePromotionType == "unique" ) {

							// update each promo desc
							var updatePromoPayload = [{
						        "keys": {
						            "MC_UNIQUE_PROMOTION_ID": response.data.items[0].values["mc_id_" + v]
						        },
						        "values": {
						        	"SENT": false,
						        	"DATE_ADDED": currentDateTimeStamp,
						        	"PROMOTION_ID": payloadBody[0]["unique_code_" + v + "_promo_id"],
						        	"PROMOTION_GROUP_ID": payloadBody[0]["unique_code_" + v + "_promo_group_id"],
						        	"PRINT_AT_TILL": payloadBody[0]["print_at_till_online"],
						        	"INSTANT_WIN": payloadBody[0]["instant_win_online"],
						        	"VALID_FROM_DATETIME": payloadBody[0]["unique_code_1_valid_from"],
						        	"VALID_TO_DATETIME": payloadBody[0]["unique_code_" + v + "_valid_to"],
						        	"VISIBLE_FROM_DATETIME": payloadBody[0]["unique_code_1_valid_from"],
						        	"VISIBLE_TO_DATETIME": payloadBody[0]["unique_code_" + v + "_valid_to"],
						        	"OFFER_DESCRIPTION": payloadBody[0]["campaign_name"],
						        	"OFFER_CHANNEL": payloadBody[0]["offer_medium_online"]
						        }
							}];
								
							console.dir(updatePromoPayload);

							getOauth2Token().then((tokenResponse) => {
							   	axios({
									method: 'post',
									url: descriptionUrl,
									headers: {'Authorization': tokenResponse},
									data: updatePromoPayload
								})
								.then(function (response) {
									console.dir(response.data);
									//return resolve(response.data);
								})
								.catch(function (error) {
									console.dir(error);
									//return reject(error);
								});
							})
						}	

					} else if ( v >= 6 && v <= 10 ) {

						// update each promo desc
						var updatePromoPayload = [{
					        "keys": {
					            "MC_UNIQUE_PROMOTION_ID": response.data.items[0].values["mc_id_" + v]
					        },
					        "values": {
					        	"SENT": false,
					        	"DATE_ADDED": currentDateTimeStamp,
					        	"PROMOTION_ID": payloadBody[0]["instore_code_" + v + "_promo_id"],
					        	"PROMOTION_GROUP_ID": payloadBody[0]["instore_code_" + v + "_promo_group_id"],
					        	"PRINT_AT_TILL": payloadBody[0]["print_at_till_instore"],
					        	"INSTANT_WIN": payloadBody[0]["instant_win_instore"],
					        	"VALID_FROM_DATETIME": payloadBody[0]["instore_code_1_valid_from"],
					        	"VALID_TO_DATETIME": payloadBody[0]["instore_code_" + v + "_valid_to"],
					        	"VISIBLE_FROM_DATETIME": payloadBody[0]["instore_code_1_valid_from"],
					        	"VISIBLE_TO_DATETIME": payloadBody[0]["instore_code_" + v + "_valid_to"],
					        	"OFFER_DESCRIPTION": payloadBody[0]["campaign_name"],
					        	"OFFER_CHANNEL": payloadBody[0]["offer_medium_instore"]
					        }
						}];
							
						console.dir(updatePromoPayload);

						getOauth2Token().then((tokenResponse) => {
						   	axios({
								method: 'post',
								url: descriptionUrl,
								headers: {'Authorization': tokenResponse},
								data: updatePromoPayload
							})
							.then(function (response) {
								console.dir(response.data);
								//return resolve(response.data);
							})
							.catch(function (error) {
								console.dir(error);
								//return reject(error);
							});
						})	

					}

				}
			}

			var updateCommPayload = [{
		        "keys": {
		            "COMMUNICATION_CELL_ID": response.data.items[0].values.communication_cell_id
		        },
		        "values": {
		        	"SENT": false,
		        	"BASE_CONTACT_DATE": currentDateTimeStamp,
			    	"cell_code"					: payloadBody[0]["cell_code"],
			    	"cell_name"					: payloadBody[0]["cell_name"],
			        "campaign_name"				: payloadBody[0]["campaign_name"],
			        "campaign_id"				: payloadBody[0]["campaign_id"],
			        "campaign_code"				: payloadBody[0]["campaign_code"],
			        "cell_type"					: "1",
			        "channel"					: "2",
			        "is_putput_flag"			: "1"	
		        }
			}];
				
			console.dir(updateCommPayload);

			getOauth2Token().then((tokenResponse) => {
			   	axios({
					method: 'post',
					url: communicationCellUrl,
					headers: {'Authorization': tokenResponse},
					data: updateCommPayload
				})
				.then(function (response) {
					console.dir(response.data);
					//return resolve(response.data);
				})
				.catch(function (error) {
					console.dir(error);
					//return reject(error);
				});
			})

			var updateCommControlPayload = [{
		        "keys": {
		            "COMMUNICATION_CELL_ID": response.data.items[0].values.communication_cell_id_control
		        },
		        "values": {
		        	"SENT": false,
		        	"BASE_CONTACT_DATE": currentDateTimeStamp,
			    	"cell_code"					: payloadBody[0]["cell_code"],
			    	"cell_name"					: payloadBody[0]["cell_name"],
			        "campaign_name"				: payloadBody[0]["campaign_name"],
			        "campaign_id"				: payloadBody[0]["campaign_id"],
			        "campaign_code"				: payloadBody[0]["campaign_code"],
			        "cell_type"					: "2",
			        "channel"					: "2",
			        "is_putput_flag"			: "0"
		        }
			}];
				
			console.dir(updateCommPayload);

			getOauth2Token().then((tokenResponse) => {
			   	axios({
					method: 'post',
					url: communicationCellUrl,
					headers: {'Authorization': tokenResponse},
					data: updateCommControlPayload
				})
				.then(function (response) {
					console.dir(response.data);
					//return resolve(response.data);
				})
				.catch(function (error) {
					console.dir(error);
					//return reject(error);
				});
			})

			var updatedCampaignPromotionAssociationData = {};

			for ( var i = 0; i < payloadBody.length; i++ ) {
				//console.dir("Step is: " + payload[i].step + ", Key is: " + payload[i].key + ", Value is: " + payload[i].value + ", Type is: " + payload[i].type);
	
				if ( updatedCampaignPromotionAssociationData[payloadBody[i].key] == "email_template" ) {
					updatedCampaignPromotionAssociationData[payloadBody[i].key] = payloadBody[i].value;
				} else {
					updatedCampaignPromotionAssociationData[payloadBody[i].key] = decodeURIComponent(payloadBody[i].value);
				}
			}

			updatedCampaignPromotionAssociationData["sent_to_optima"] = false;
			updatedCampaignPromotionAssociationData["date_edited"] = currentDateTimeStamp;


			var updateCpaPayload = [{
		        "keys": {
		            "promotion_key": response.data.items[0].keys.promotion_key
		        },
		        "values": updatedCampaignPromotionAssociationData
			}];
				
			console.dir(updateCpaPayload);

			getOauth2Token().then((tokenResponse) => {
			   	axios({
					method: 'post',
					url: campaignAssociationUrl,
					headers: {'Authorization': tokenResponse},
					data: updateCpaPayload
				})
				.then(function (response) {
					console.dir(response.data);
					//return resolve(response.data);
				})
				.catch(function (error) {
					console.dir(error);
					//return reject(error);
				});
			})

			return response.data;	

		})
		.catch((error) => {
		    console.dir("Error getting promotions");
		    console.dir(error);
		});
	})
	
}

// insert data into data extension
app.post('/dataextension/set-live/:fuel2Token', async function (req, res){
	console.dir("The fuel token sent is: ");
	console.dir(req.params.fuel2Token); 
	console.dir("Dump update request body");
	console.dir(req.body);
	console.dir("the update key is");
	console.dir(req.body[0].key);

	var token = req.params.fuel2Token;

	if ( token ) {

		const tokenContextResponse  =  await validateTokenContext(token);
		console.dir("The returned user id is:");
		console.dir(tokenContextResponse.data.user);

		if ( tokenContextResponse.data.user ) {
			try {
				const returnedUpdate = await setLive(req.body[0].key);
				res.send(JSON.stringify(returnedUpdate));
			} catch(err) {
				console.dir(err);
			}			
		}
	}
});

// insert data into data extension
app.post('/dataextension/update-existing/:fuel2Token', async function (req, res){ 
	console.dir("The fuel token sent is: ");
	console.dir(req.params.fuel2Token);
	console.dir("Dump update request body");
	console.dir(req.body);
	console.dir("the update key is");
	console.dir(req.body[0].value);

	var token = req.params.fuel2Token;

	if ( token ) {

		const tokenContextResponse  =  await validateTokenContext(token);
		console.dir("The returned user id is:");
		console.dir(tokenContextResponse.data.user);

		if ( tokenContextResponse.data.user ) {
			try {
				const updateExistingPromotionStatus = await updateExistingPromotion(req.body[0].value, req.body);
				res.send({"success": "true"});
			} catch(err) {
				console.dir(err);
			}			
		}
	}
});

app.post('/journeybuilder/save/', activity.save );
app.post('/journeybuilder/validate/', activity.validate );
app.post('/journeybuilder/publish/', activity.publish );
app.post('/journeybuilder/execute/', activity.execute );
app.post('/journeybuilder/stop/', activity.stop );
app.post('/journeybuilder/unpublish/', activity.unpublish );

// track app use
app.use((req,res,next)=>{
	console.log('req recieved from client');
	next();//this will invoke next middleware function
})
// listening port
http.createServer(app).listen(app.get('port'), function(req, res){
  console.log('Express server listening on port ' + app.get('port'));
});