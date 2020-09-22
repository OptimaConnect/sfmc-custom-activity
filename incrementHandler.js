const tokenHandler  = require("./tokenHandler.js");
const axios 	    = require('axios');

exports.claimNewIds = async function() {
	try {
		const tokenResponse = await tokenHandler.getOauth2Token();
		const response = await axios.get(incrementsUrl, { 
			headers: { 
				Authorization: tokenResponse
			}
		});

		const existingIdStrings = response.data.items[0].values;
		const existingIds = {
			communication_cell_code_id_increment : parseInt(existingIdStrings.communication_cell_code_id_increment),
			mc_unique_promotion_id_increment: parseInt(existingIdStrings.mc_unique_promotion_id_increment),
			promotion_key: parseInt(existingIdStrings.promotion_key)
		}

		const insertPayload = [{
			keys: {
				increment_key: 1
			},
			values: {
				communication_cell_code_id_increment: existingIds.communication_cell_code_id_increment + 2,
				mc_unique_promotion_id_increment: existingIds.mc_unique_promotion_id_increment + 2,
				promotion_key: existingIds.promotion_key + 2
			}
		}];

		await axios({
			method: 'post',
			url: updateIncrementsUrl,
			headers: { 'Authorization': tokenResponse },
			data: insertPayload
		});

		return {
			communication_cell_id: existingIds.communication_cell_code_id_increment + 1,
			mc_unique_promotion_id: existingIds.mc_unique_promotion_id_increment + 1,
			promotion_key: existingIds.promotion_key + 1
		}
	} catch (err) {
		throw new Error(`Failed to claim new ids: ${err}`);
	}
}