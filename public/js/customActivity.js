define([
    'postmonger'
], function(
    Postmonger
) {
    'use strict';

    // ensure all requests only come from SFMC s50 stack
    if ( document.referrer != "https://jbinteractions.s50.marketingcloudapps.com/" ) {
        throw new Error("This application can only be accessed with Salesforce Marketing Cloud.");
    }

    var debug                       = true;
    var apiWaitTime                 = 500;
    var stepToValidate;
    var connection                  = new Postmonger.Session();
    var payload                     = {};
    var payloadNode                 = {};
    var onlineSetupStepEnabled      = false;
    var instoreSetupStepEnabled     = false;
    var steps                       = [
        { "label": "Promotion Type", "key": "step0" },
        { "label": "Online Voucher Setup", "key": "step1", "active": false },
        { "label": "Instore Voucher Setup", "key": "step2", "active": false },
        { "label": "Summary", "key": "step3" }
    ];
    var currentStep = steps[0].key;
    var stepValidation = false;
    var payloadToSave;
    var summaryPayload;

    if ( debug ) {
        console.log("Current Step is: " + currentStep);
    }

    setTimeout(function(){ 
        $("#spinner").hide();
    }, 30000);

    $(window).ready(onRender);

    connection.on('initActivity', initialize);
    connection.on('requestedTokens', onGetTokens);
    connection.on('requestedEndpoints', onGetEndpoints);

    connection.on('clickedNext', onClickedNext);
    connection.on('clickedBack', onClickedBack);
    connection.on('gotoStep', onGotoStep);

    function onRender() {
        var debug = true;
        // JB will respond the first time 'ready' is called with 'initActivity'
        connection.trigger('ready');

        connection.trigger('requestTokens');
        connection.trigger('requestEndpoints');

        lookupPromos();
        lookupGlobalCodes();
        lookupTemplates();
        lookupVoucherPots();
        lookupControlGroups();
        lookupUpdateContacts();
        loadEvents();
        setGlobalCodeBlock();
    }

    function initialize (data) {
        
        if (data) {
            payload = data;
            var argumentsSummaryPayload = payload.arguments.execute.inArguments[0];
        }

        if ( debug ) {
            console.log("Payload is:");
            console.log(payload.arguments.execute.inArguments[0]);
            console.log("Summary payload is:");
            console.log(argumentsSummaryPayload.buildPayload);
            console.log("Promotion Meta Data is:");
            console.log(payload.metadata)
        }

        var hasInArguments = Boolean(
            payload['arguments'] &&
            payload['arguments'].execute &&
            payload['arguments'].execute.inArguments &&
            payload['arguments'].execute.inArguments.length > 0
        );

        var inArguments = hasInArguments ? payload['arguments'].execute.inArguments : {};

        if ( debug ) {
            console.log("In arguments object is:");
            console.log(inArguments);
            console.log("promotion type from arg is:");
            console.log(argumentsSummaryPayload.buildPayload);
        }

        if ( argumentsSummaryPayload.buildPayload ) {

            if ( debug ) {
                console.log("inside if statement i.e. promotion key is present")
                console.log(argumentsSummaryPayload.buildPayload);
            }

            var argPromotionType;
            var argKey;

            for ( var r = 0; r < argumentsSummaryPayload.buildPayload.length; r++ ) {
                if ( argumentsSummaryPayload.buildPayload[r].key == "promotionType" ) {
                    argPromotionType = argumentsSummaryPayload.buildPayload[r].value; 
                } else if ( argumentsSummaryPayload.buildPayload[r].key == "promotion_key_hidden" ) {

                    if ( argumentsSummaryPayload.buildPayload[r].value ) {
                        argKey = argumentsSummaryPayload.buildPayload[r].value;
                        $("#promotion_key_hidden").val(argKey);
                        $("#control_action_update").prop('disabled', false)
                        $("#control_action_test").prop('disabled', true);
                        $("#control_action_optima").prop('disabled', false);
                        $("#main_setup_key").html(argKey);
                    } else {
                        $("#control_action_test").prop('disabled', false);
                        $("#control_action_update").prop('disable', true);
                        $("#control_action_optima").prop('disabled', true); 
                        $("#control_action_test").html("Save and Test");                       
                    }
                }
            }

            for ( var r = 0; r < argumentsSummaryPayload.buildPayload.length; r++ ) {

                if (argumentsSummaryPayload.buildPayload[r].key == "sent" && argumentsSummaryPayload.buildPayload[r].key == "true" ) {
                        $("#control_action_test").prop('disabled', true);
                        $("#control_action_update").prop('disable', true);
                        $("#control_action_optima").prop('disabled', true); 
                }
            }

            // argument data present, pre pop and redirect to summary page
            prePopulateFields(argumentsSummaryPayload.buildPayload);

            // update summary page
            updateSummaryPage(argumentsSummaryPayload.buildPayload);

            // trigger steps
            triggerSteps(argumentsSummaryPayload.buildPayload, argPromotionType);

        }
    }

    function loadEvents() {

        // render relevant steps based on input
        $('.promotion_type').click(function() {

            var promotionType = $("input[name='promotionType']:checked").val();

            if ( debug ) {
                console.log(promotionType);
            }

            if ( promotionType === 'online' ) {

                if ( debug ) {
                    console.log("trigger step 1");   
                }
                
                onlineSetupStepEnabled = true; // toggle status
                steps[1].active = true; // toggle active
                instoreSetupStepEnabled = false; // toggle status
                steps[2].active = false; // toggle active
                $("#email_template_box").show();
                $("#update_contact_box").hide();

                if ( debug ) {
                    console.log(onlineSetupStepEnabled);
                    console.log(instoreSetupStepEnabled);
                    console.log(steps);                    
                }

                connection.trigger('updateSteps', steps);

            } else if ( promotionType === 'instore' ) {

                if ( debug ) {
                    console.log("trigger step 2");   
                }
                
                onlineSetupStepEnabled = false; // toggle status
                steps[1].active = false; // toggle active
                instoreSetupStepEnabled = true; // toggle status
                steps[2].active = true; // toggle active
                $("#email_template_box").show();
                $("#update_contact_box").hide();
                $("#code2").show();
                $("#code3").show();
                $("#code4").show();
                $("#code5").show();


                if ( debug ) {
                    console.log(onlineSetupStepEnabled);
                    console.log(instoreSetupStepEnabled);
                    console.log(steps);                    
                }

                connection.trigger('updateSteps', steps);

            } else if ( promotionType === 'online_instore' ) {

                if ( debug ) {
                    console.log("trigger step 1 & 2");                    
                }

                onlineSetupStepEnabled = true; // toggle status
                steps[1].active = true; // toggle active

                if ( debug ) {
                    console.log(steps);                    
                }

                instoreSetupStepEnabled = true; // toggle status
                steps[2].active = true; // toggle active
                $("#email_template_box").show();
                $("#update_contact_box").hide();
                $("#code2").show();
                $("#code3").show();
                $("#code4").show();
                $("#code5").show();

                if ( debug ) {
                    console.log(steps);
                    console.log(onlineSetupStepEnabled);
                    console.log(instoreSetupStepEnabled);
                }
                connection.trigger('updateSteps', steps);

            } else if ( promotionType === 'nocode' ) {

                if ( debug ) {
                    console.log("trigger step 2");   
                }
                
                onlineSetupStepEnabled = false; // toggle status
                steps[1].active = false; // toggle active
                instoreSetupStepEnabled = true; // toggle status
                steps[2].active = true; // toggle active

                // hide email input and show update contact input
                $("#email_template_box").hide();
                $("#update_contact_box").show();
                $("#code2").hide();
                $("#code3").hide();
                $("#code4").hide();
                $("#code5").hide();

                if ( debug ) {
                    console.log(onlineSetupStepEnabled);
                    console.log(instoreSetupStepEnabled);
                    console.log(steps);                    
                }

                connection.trigger('updateSteps', steps);
            }

        });

        $('.online_promotion_type').click(function() {

            var onlinePromotionType = $("input[name='onlinePromotionType']:checked").val();
            if ( onlinePromotionType == 'global' ) {

                $("#show_unique_codes").hide();
                $("#show_global_codes").show();

            } else {

                $("#show_unique_codes").show();
                $("#show_global_codes").hide();

            }

        });


        // hide the tool tips on page load
        $('.slds-popover_tooltip').hide();

        // hide error messages
        $('.slds-form-element__help').hide();

        // locate and show relevant tooltip
        $('.slds-button_icon').on("click",function(e){

            // make sure any opened tooltips are closed
            //$('.slds-popover_tooltip').hide();
            var clickedElement = $(this).attr('id').split("__");

            if ( debug ) {
                console.log(clickedElement);
            }
            
            var helpBlock = "#" + clickedElement[0] + "__help";

            if ( debug ) {
                console.log(helpBlock);    
            }
            
            $(helpBlock).show();

            setTimeout(function() {
                $(helpBlock).fadeOut();
            }, 5000);

        });

        // if channel is PUSH, hide codes 2345 on both instore and online
        $("#channel").change(function() {
            // set instant win to opposite
            if ( $("#channel").val() == "3" || $("#channel").val() == "4") {

                $(".hide-code").hide();
                $("#code2").hide();
                $("#code3").hide();
                $("#code4").hide();
                $("#code5").hide();

            } else {

                $(".hide-code").show();
                $("#code2").show();
                $("#code3").show();
                $("#code4").show();
                $("#code5").show();
            }
        });

        // ensure print at till and instant win can never be the same value

        $("#print_at_till_online").change(function() {
            // set instant win to opposite
            if ( $("#print_at_till_online").val() == "true" ) {
                // set instant win to false
                $('#instant_win_online option[value="false"]').prop("selected", "selected");
            }
        });

        $("#instant_win_online").change(function() {
            // set instant win to opposite
            if ( $("#instant_win_online").val() == "true" ) {
                // set instant win to false
                $('#print_at_till_online option[value="false"]').prop("selected", "selected");
            }
        });

        $("#print_at_till_instore").change(function() {
            // set instant win to opposite
            if ( $("#print_at_till_instore").val() == "true" ) {
                // set instant win to false
                $('#instant_win_instore option[value="false"]').prop("selected", "selected");
            }
        });

        $("#instant_win_instore").change(function() {
            // set instant win to opposite
            if ( $("#instant_win_instore").val() == "true" ) {
                // set instant win to false
                $('#print_at_till_instore option[value="false"]').prop("selected", "selected");
            }
        });

        // ensure instore promo id is automatically set and is read-only
        $("#instore_code_1, #instore_code_2, #instore_code_3, #instore_code_4, #instore_code_5").change(function(){
            var instoreCodeIndex = this.id.slice(-1); 
            if ( $("option:selected", this).attr("data-attribute-loyalty") == "True" ) {
                var instoreCodeLoyaltyPromotion = true;
            } else {
                var instoreCodeLoyaltyPromotion = false;
            }

            // set data value
            $("#instore_code_"+instoreCodeIndex+"_valid_from").val($("option:selected", this).attr("data-attribute-validfrom"));
            $("#instore_code_"+instoreCodeIndex+"_valid_to").val($("option:selected", this).attr("data-attribute-validto"));

            // set promo id
            $("#instore_code_"+instoreCodeIndex+"_promo_id").val(this.value);

            // set promo id
            $("#instore_code_"+instoreCodeIndex+"_promo_group_id").val(this.value);

            // set loyalty promotion
            $("#instore_code_"+instoreCodeIndex+"_loyalty_promotion").val(instoreCodeLoyaltyPromotion);

            // set redemptions 1
            $("#instore_code_"+instoreCodeIndex+"_redemptions").val(1);
        });

        $("#global_code_1, #global_code_2, #global_code_3, #global_code_4, #global_code_5").change(function(){
            var globalCodeIndex = this.id.slice(-1); 
            // set data value
            $("#global_code_"+globalCodeIndex+"_valid_from").val($("option:selected", this).attr("data-attribute-validfrom"));
            $("#global_code_"+globalCodeIndex+"_valid_to").val($("option:selected", this).attr("data-attribute-validto"));
        });

        // select first input
        $("#radio-1").click();

        // handler for Optima button
        $("#control_action_optima").click(function(){
            setLive($("#promotion_key_hidden").val());
            $("#sent").val(true);
        });

        // handler for Optima button
        $("#control_action_update").click(function(){
            updateExistingPromotion($("#promotion_key_hidden").val(), buildActivityPayload());
            $("#sent").val(false);
        });

        // handler for Optima button
        $("#control_action_test").click(function(){
            saveToDataExtension(buildActivityPayload(), false);
            $("#sent").val(false);
        });

    }

    function updateApiStatus(endpointSelector, endpointStatus) {

        if ( endpointStatus ) {
            setTimeout(function() {
                $("#" + endpointSelector + " > div > div").removeClass("slds-theme_info");
                $("#" + endpointSelector + " > div > div > span:nth-child(2)").removeClass("slds-icon-utility-info");
                $("#" + endpointSelector + " > div > div").addClass("slds-theme_success");
                $("#" + endpointSelector + " > div > div > span:nth-child(2)").addClass("slds-icon-utility-success");
                $("#" + endpointSelector + " > div > div > span:nth-child(2) svg use").attr("xlink:href","/assets/icons/utility-sprite/svg/symbols.svg#success");
                $("#" + endpointSelector + " > div > div > .slds-notify__content h2").text($("#" + endpointSelector + " > div > div > .slds-notify__content h2").text().replace("Loading", "Loaded"));
            }, apiWaitTime);
        
        } else {
            setTimeout(function() {
                $("#" + endpointSelector + " > div > div").removeClass("slds-theme_info");
                $("#" + endpointSelector + " > div > div > span:nth-child(2)").removeClass("slds-icon-utility-info");
                $("#" + endpointSelector + " > div > div").addClass("slds-theme_error");
                $("#" + endpointSelector + " > div > div > span:nth-child(2)").addClass("slds-icon-utility-error");
                $("#" + endpointSelector + " > div > div > span:nth-child(2) svg use").attr("xlink:href","/assets/icons/utility-sprite/svg/symbols.svg#error");
                $("#" + endpointSelector + " > div > div > .slds-notify__content h2").text($("#" + endpointSelector + " > div > div > .slds-notify__content h2").text().replace("Loading", "Error Loading"));
            }, apiWaitTime);
        }

        apiWaitTime = apiWaitTime + 200;

    }

    function prePopulateFields(argumentsSummaryPayload) {

        if ( debug) {
            console.log("payload sent to prepop function");
            console.log(argumentsSummaryPayload);
        }

        setTimeout(function(){ 

            var q;

            for ( q = 0; q < argumentsSummaryPayload.length; q++ ) {
                if ( debug ) {
                    console.log("Prepop: " + argumentsSummaryPayload[q].key + ", with value: " + argumentsSummaryPayload[q].value + ", and type: " + argumentsSummaryPayload[q].type);
                }

                if ( argumentsSummaryPayload[q].type == "checkbox") {

                    if ( argumentsSummaryPayload[q].value ) {
                        $("#" + argumentsSummaryPayload[q].key).val(true);
                        $("#" + argumentsSummaryPayload[q].key).prop('checked', "checked");
                    }
                    
                } else if ( argumentsSummaryPayload[q].type == "radio") {
                    if ( argumentsSummaryPayload[q].key == "promotionType") {
                        if ( argumentsSummaryPayload[q].value == "online") {
                            $("#radio-1").prop('checked', true);
                            $("#radio-1").click();
                        } else if ( argumentsSummaryPayload[q].value == "instore") {
                            $("#radio-2").prop('checked', true);
                            $("#radio-2").click();
                        } else if ( argumentsSummaryPayload[q].value == "online_instore") {
                            $("#radio-3").prop('checked', true);
                            $("#radio-3").click();
                        } else if ( argumentsSummaryPayload[q].value == "nocode") {
                            $("#radio-4").prop('checked', true);
                            $("#radio-4").click();
                        }
                    } else if ( argumentsSummaryPayload[q].key == "onlinePromotionType") {
                        if ( argumentsSummaryPayload[q].value == "global" ) {
                            $("#radio-5").prop('checked', true);
                            $("#radio-5").click();
                        } else if ( argumentsSummaryPayload[q].value == "unique") {
                            $("#radio-6").prop('checked', true);
                            $("#radio-6").click();
                        }
                    }
                }

                $("#step" + (argumentsSummaryPayload[q].step - 1) + " #" + argumentsSummaryPayload[q].key).val(argumentsSummaryPayload[q].value);

            } 
        }, 2000);
    }

    function triggerSteps(argumentsSummaryPayload, argPromotionType) {

        // argument data present, pre pop and redirect to summary page
        var prepopPromotionType = argPromotionType;

        if ( debug ) {
            console.log("prepopPromotionType is");
            console.log(prepopPromotionType);
        }

        var prePop;

        if ( prepopPromotionType == 'online' ) {
            steps[1].active = true;
            steps[3].active = true;
            connection.trigger('updateSteps', steps);
            setTimeout(function() {
                connection.trigger('nextStep');
            }, 10);
            setTimeout(function() {
                connection.trigger('nextStep');
            }, 20);
            setTimeout(function() {
                showStep(null, 3);
            }, 30);
        } else if ( prepopPromotionType == 'instore' || prepopPromotionType == 'nocode' ) {
            steps[2].active = true;
            steps[3].active = true;
            connection.trigger('updateSteps', steps);
            setTimeout(function() {
                connection.trigger('nextStep');
            }, 10);
            setTimeout(function() {
                connection.trigger('nextStep');
            }, 20);
            setTimeout(function() {
                showStep(null, 3);
            }, 30);
        } else  if ( prepopPromotionType == 'online_instore' ) {
            steps[1].active = true;
            steps[2].active = true;
            steps[3].active = true;
            connection.trigger('updateSteps', steps);
            setTimeout(function() {
                connection.trigger('nextStep');
            }, 10);
            setTimeout(function() {
                connection.trigger('nextStep');
            }, 20);
            setTimeout(function() {
                connection.trigger('nextStep');
            }, 30);
            setTimeout(function() {
                showStep(null, 3);
            }, 40);
        } else {
            if ( debug ) {
                console.log('nothing to pre-pop setting step 0 and first radio checked');
            }
            $("#radio-1").prop("checked", true).trigger("click");
        }
        if ( debug ) {
            console.log(prePop);
        }

    }

    function validateStep(stepToValidate) {

        if (debug) {
            console.log("Step that will be validated");
            console.log(stepToValidate);
        }

        if ( $("#step" + stepToValidate).find('.slds-has-error').length > 0 ) {

            return false;

        } else if ( stepToValidate == 0 ) {

            var step0Selectors = ["#email_template", "#cell_code", "#cell_name", "#campaign_id", "#campaign_name", "#campaign_code"];
            var step0ErrorCount = 0;

            var promotionSelectedType = $(".promotion_type:checked").val();

            for ( var n = 0; n < step0Selectors.length; n++ ) {

                console.log("The selector is " + step0Selectors[n]);

                if ( !$(step0Selectors[n]).val() ) {

                    step0ErrorCount++;
                }
            }
            if ( promotionSelectedType == 'nocode') {
                // instant win print at till, check update contact is selected
                if ( $("#update_contacts").val() == "no-code") {
                    step0ErrorCount++;
                }
            }

            if ( step0ErrorCount == 0 ) {

                return true;

            } else {

                return false;

            }

        } else if ( stepToValidate == 1 ) {

            var onelineCodeType = $(".online_promotion_type:checked").val();

            var step1Selectors = ["#"+onelineCodeType+"_code_1", "#"+onelineCodeType+"_code_1_promo_id", "#"+onelineCodeType+"_code_1_promo_group_id"];
            var step1ErrorCount = 0;

            for ( var l = 0; l < step1Selectors.length; l++ ) {

                console.log("The selector is " + step1Selectors[l]);

                if ( !$(step1Selectors[l]).val() ) {

                    step1ErrorCount++;
                }
            }

            if ( step1ErrorCount == 0 ) {

                return true;

            } else {

                return false;

            }

        } else if ( stepToValidate == 2 ) {

            var step2Selectors = ["#instore_code_1", "#instore_code_1_promo_id", "#instore_code_1_promo_group_id"];
            var step2ErrorCount = 0;

            for ( var m = 0; m < step2Selectors.length; m++ ) {

                console.log("The selector is " + step2Selectors[m]);

                if ( !$(step2Selectors[m]).val() ) {

                    step2ErrorCount++;
                }
            }

            if ( step2ErrorCount == 0 ) {

                return true;

            } else {

                return false;

            }            

        } else {

            return true;

        }
        
    }

    function validateSingleField(element) {

        // your code
        console.log($(element).val());
        console.log($(element).attr("data-attribute-length"));
        console.log($(element).attr("data-attribute-type"));

        var elementValue = $(element).val();
        var elementId = $(element).attr('id');
        var elementLength = $(element).attr("data-attribute-length");
        var elementType = $(element).attr("data-attribute-type");

        if ( elementId == "promotion_id_1" ) {

            $("#promotion_group_id_online").val(elementValue);

        } else if ( elementId == "promotion_id_6" ) {

            $("#promotion_group_id_instore").val(elementValue);

        }

        if ( elementType == 'int' ) {

            // value must be number
            if ( !isWholeNumber(elementValue) && elementValue <= 0 && elementValue.length <= elementLength) {

                $(element).parents().eq(1).addClass("slds-has-error");
                $("#form-error__" + elementId).html("This value must be a number. Less than 30 digits and cannot be empty");
                $("#form-error__" + elementId).show();

            } else {

                console.log("hiding error");
                $("#form-error__" + elementId).hide();
                $(element).parents().eq(1).removeClass("slds-has-error");

            }

        } else if ( elementType == 'varchar' ) {

            // value must be varchar
            if ( elementValue.length >= elementLength || isEmpty(elementValue) ) {

                console.log("value is empty or greater than required length")
                // value must be less than length
                $(element).parents().eq(1).addClass("slds-has-error");
                $("#form-error__" + elementId).html("Value must be less than " + elementLength +" characters and cannot be empty");
                $("#form-error__" + elementId).show();
            
            } else {

                console.log("hiding error");
                $("#form-error__" + elementId).hide();
                $(element).parents().eq(1).removeClass("slds-has-error");

            }

        }

    }


    function isEmpty (value) {
        return ((value == null) || 
                (value.hasOwnProperty('length') && 
                value.length === 0) || 
                (value.constructor === Object && 
                Object.keys(value).length === 0) 
            );
    }

    function isWholeNumber(num) {
        return num === Math.round(num);
    }

    function isTwoValuesUsed(voucherPotValue, globalOnlineCodeValue) {
        return voucherPotValue != '' && globalOnlineCodeValue != '';
    }

    function isValidInstoreCode(selectedCode) {
        return selectedCode !== 'Please select a code' && selectedCode != '';
    }

    function setGlobalCodeBlock() {
        $("#show_global_codes").show();
    }

    function lookupGlobalCodes() {

        // access offer types and build select input
        $.ajax({
            url: "/dataextension/lookup/globalcodes", 
            error: function() {
                updateApiStatus("onlinecodes-api", false);
            },
            success: function(result){

                if ( debug ) {
                    console.log('lookup global codes executed');
                    console.log(result.items);               
                }

                var i;
                if ( result.items.length > 0 ) {
                    for (i = 0; i < result.items.length; ++i) {
                        if ( debug ) {
                            console.log(result.items[i].keys.couponcode);
                        }
                        // do something with `substr[i]
                        $("#global_code_1").append("<option data-attribute-validfrom='" + result.items[i].values.validfrom + "' data-attribute-validto='" + result.items[i].values.validto + "' value=" + encodeURI(result.items[i].keys.couponcode) + ">" + result.items[i].keys.couponcode + "</option>");
                        $("#global_code_2").append("<option data-attribute-validfrom='" + result.items[i].values.validfrom + "' data-attribute-validto='" + result.items[i].values.validto + "' value=" + encodeURI(result.items[i].keys.couponcode) + ">" + result.items[i].keys.couponcode + "</option>");
                        $("#global_code_3").append("<option data-attribute-validfrom='" + result.items[i].values.validfrom + "' data-attribute-validto='" + result.items[i].values.validto + "' value=" + encodeURI(result.items[i].keys.couponcode) + ">" + result.items[i].keys.couponcode + "</option>");
                        $("#global_code_4").append("<option data-attribute-validfrom='" + result.items[i].values.validfrom + "' data-attribute-validto='" + result.items[i].values.validto + "' value=" + encodeURI(result.items[i].keys.couponcode) + ">" + result.items[i].keys.couponcode + "</option>");
                        $("#global_code_5").append("<option data-attribute-validfrom='" + result.items[i].values.validfrom + "' data-attribute-validto='" + result.items[i].values.validto + "' value=" + encodeURI(result.items[i].keys.couponcode) + ">" + result.items[i].keys.couponcode + "</option>");
                    }                    
                }

                updateApiStatus("onlinecodes-api", true);
            }
        });
    }

    function lookupPromos() {

        // access offer types and build select input
        $.ajax({

            url: "/dataextension/lookup/promotions",
            error: function() {
                updateApiStatus("instorecodes-api", false);
            }, 
            success: function(result){

                if ( debug ) {
                    console.log('lookup promotions executed');
                    console.log(result.items);               
                }

                var i;
                for (i = 0; i < result.items.length; ++i) {
                    if ( debug ) {
                        console.log(result.items[i].keys);
                    }
                    // do something with `substr[i]
                    $("#instore_code_1").append("<option data-attribute-loyalty=" + result.items[i].values.bispromotionheader + " data-attribute-validfrom=" + result.items[i].values.datefrom + " data-attribute-validto=" + result.items[i].values.dateto + " value=" + encodeURI(result.items[i].values.discountmediaid) + ">" + result.items[i].keys.discountid + " - " + result.items[i].values.name + "</option>");
                    $("#instore_code_2").append("<option data-attribute-loyalty=" + result.items[i].values.bispromotionheader + " data-attribute-validfrom=" + result.items[i].values.datefrom + " data-attribute-validto=" + result.items[i].values.dateto + " value=" + encodeURI(result.items[i].values.discountmediaid) + ">" + result.items[i].keys.discountid + " - " + result.items[i].values.name + "</option>");
                    $("#instore_code_3").append("<option data-attribute-loyalty=" + result.items[i].values.bispromotionheader + " data-attribute-validfrom=" + result.items[i].values.datefrom + " data-attribute-validto=" + result.items[i].values.dateto + " value=" + encodeURI(result.items[i].values.discountmediaid) + ">" + result.items[i].keys.discountid + " - " + result.items[i].values.name + "</option>");
                    $("#instore_code_4").append("<option data-attribute-loyalty=" + result.items[i].values.bispromotionheader + " data-attribute-validfrom=" + result.items[i].values.datefrom + " data-attribute-validto=" + result.items[i].values.dateto + " value=" + encodeURI(result.items[i].values.discountmediaid) + ">" + result.items[i].keys.discountid + " - " + result.items[i].values.name + "</option>");
                    $("#instore_code_5").append("<option data-attribute-loyalty=" + result.items[i].values.bispromotionheader + " data-attribute-validfrom=" + result.items[i].values.datefrom + " data-attribute-validto=" + result.items[i].values.dateto + " value=" + encodeURI(result.items[i].values.discountmediaid) + ">" + result.items[i].keys.discountid + " - " + result.items[i].values.name + "</option>");
                }
                updateApiStatus("instorecodes-api", true);
            }

        });
    }

    function lookupTemplates() {

        // access offer types and build select input
        $.ajax({

            url: "/dataextension/lookup/templates", 
            error: function() {
                updateApiStatus("email-api", false);
            }, 
            success: function(result){

                if ( debug ) {
                    console.log('lookup templates executed');
                    //console.log(result.items);               
                }

                var i;
                for (i = 0; i < result.items.length; ++i) {
                    if ( debug ) {
                        //console.log(result.items[i]);
                    }
                    // do something with substr[i]
                    $('#email_template option[value="loading"]').remove();
                    $("#email_template").append("<option value=" + encodeURI(result.items[i].name) + ">" + result.items[i].name + "</option>");
                }

                // access offer types and build select input
                $.ajax({

                    url: "/dataextension/lookup/campaigns", 
                    error: function() {
                        updateApiStatus("email-api", false);
                    }, 
                    success: function(result){

                        if ( debug ) {
                            console.log('lookup campaigns executed');
                            //console.log(result.items);               
                        }

                        var i;
                        for (i = 0; i < result.items.length; ++i) {
                            if ( debug ) {
                                console.log("The keys for the campaign lookup is");
                                console.log(result.items[i].keys);
                                console.log("And the email template we are on is");
                                console.log(result.items[i].values.email_template);
                            }
                            // do something with substr[i]
                            $("#email_template > option").each(function() {
                                console.log("the select option is");
                                console.log(decodeURI(this.value));
                                if ( result.items[i].values.sent_to_optima == "True" || result.items[i].values.sent_to_optima == true ) {
                                    if ( decodeURI(this.value) == result.items[i].values.email_template && this.value != "no-template" ) {
                                        $(this).remove();
                                    }
                                }
                            });
                        }

                        updateApiStatus("email-api", true);
                        setTimeout(function(){ 
                            $("#spinner").hide();
                            console.log("here");
                        }, 4000);
                    }
                });
            }
        });

    }

    function lookupControlGroups() {

        // access offer types and build select input
        $.ajax({
            url: "/dataextension/lookup/controlgroups",
            error: function() {
                updateApiStatus("controlgroup-api", false);
            },  
            success: function(result){

                if ( debug ) {
                    console.log('lookup control groups executed');
                    console.log(result.items);               
                }

                var i;
                for (i = 0; i < result.items.length; ++i) {
                    if ( debug ) {
                        console.log(result.items[i]);
                    }
                    // do something with substr[i]
                    $("#control_group").append("<option value=" + encodeURI(result.items[i].values.dataextensionname) + ">" + result.items[i].values.dataextensionname + "</option>");
                }
                updateApiStatus("controlgroup-api", true);
            }
        });
    }

    function lookupUpdateContacts() {

        // access offer types and build select input
        $.ajax({
            url: "/dataextension/lookup/updatecontacts",
            error: function() {
                updateApiStatus("updatecontacts-api", false);
            },  
            success: function(result){

                if ( debug ) {
                    console.log('lookup update contacts executed');
                    console.log(result.items);               
                }

                var i;
                for (i = 0; i < result.items.length; ++i) {
                    if ( debug ) {
                        console.log(result.items[i]);
                    }
                    // do something with substr[i]
                    $("#update_contacts").append("<option value=" + encodeURI(result.items[i].values.dataextensionname) + ">" + result.items[i].values.dataextensionname + "</option>");
                }
                updateApiStatus("updatecontact-api", true);
            }
        });
    }

    function lookupVoucherPots() {

        // access offer types and build select input
        $.ajax({
            url: "/dataextension/lookup/voucherpots",
            error: function() {
                updateApiStatus("voucherpot-api", false);
            },  
            success: function(result){

                if ( debug ) {
                    console.log('lookup voucher pots executed');
                    console.log(result.items);               
                }

                var i;
                for (i = 0; i < result.items.length; ++i) {
                    if ( debug ) {
                        console.log(result.items[i]);
                    }
                    // do something with substr[i]
                    $("#unique_code_1").append("<option data-attribute-count="+ result.items[i].values.count +" value=" + result.items[i].values.dataextensionname + ">" + result.items[i].values.dataextensionname + " - Type: " + result.items[i].values.type.toUpperCase() + " - Unclaimed Rows: " + (result.items[i].values.count - result.items[i].values.claimedrows) + "</option>");
                    $("#unique_code_2").append("<option data-attribute-count="+ result.items[i].values.count +" value=" + result.items[i].values.dataextensionname + ">" + result.items[i].values.dataextensionname + " - Type: " + result.items[i].values.type.toUpperCase() + " - Unclaimed Rows: " + (result.items[i].values.count - result.items[i].values.claimedrows)  + "</option>");
                    $("#unique_code_3").append("<option data-attribute-count="+ result.items[i].values.count +" value=" + result.items[i].values.dataextensionname + ">" + result.items[i].values.dataextensionname + " - Type: " + result.items[i].values.type.toUpperCase() + " - Unclaimed Rows: " + (result.items[i].values.count - result.items[i].values.claimedrows)  + "</option>");
                    $("#unique_code_4").append("<option data-attribute-count="+ result.items[i].values.count +" value=" + result.items[i].values.dataextensionname + ">" + result.items[i].values.dataextensionname + " - Type: " + result.items[i].values.type.toUpperCase() + " - Unclaimed Rows: " + (result.items[i].values.count - result.items[i].values.claimedrows)  + "</option>");
                    $("#unique_code_5").append("<option data-attribute-count="+ result.items[i].values.count +" value=" + result.items[i].values.dataextensionname + ">" + result.items[i].values.dataextensionname + " - Type: " + result.items[i].values.type.toUpperCase() + " - Unclaimed Rows: " + (result.items[i].values.count - result.items[i].values.claimedrows)  + "</option>");
                }
                updateApiStatus("voucherpot-api", true);
            }
        });
    }

    function toggleStepError(errorStep, errorStatus) {

        if ( debug ) {
            console.log("error step is " + errorStep + " and error status is " + errorStatus);
        }

        if ( errorStatus == "show" ) {
            $("#step" + errorStep + "alert").show();
        } else {
            $("#step" + errorStep + "alert").hide();
        }
    }

    function onGetTokens (tokens) {
        // Response: tokens == { token: <legacy token>, fuel2token: <fuel api token> }
        // console.log(tokens);
    }

    function onGetEndpoints (endpoints) {
        // Response: endpoints == { restHost: <url> } i.e. "rest.s1.qa1.exacttarget.com"
        // console.log(endpoints);
    }

    function onGetSchema (payload) {
        // Response: payload == { schema: [ ... ] };
        // console.log('requestedSchema payload = ' + JSON.stringify(payload, null, 2));
    }

    function onGetCulture (culture) {
        // Response: culture == 'en-US'; culture == 'de-DE'; culture == 'fr'; etc.
        // console.log('requestedCulture culture = ' + JSON.stringify(culture, null, 2));
    }

    function onClickedNext () {

        var promotionType = $("#step0 .slds-radio input[name='promotionType']:checked").val();

        if ( debug ) {
            console.log(promotionType);
            console.log(currentStep.key);
            console.log("next clicked");           
        }

        if ( promotionType == 'online' ) {

            if ( currentStep.key === 'step0') {

                if ( validateStep(0) ) {

                    if ( debug ) {
                        console.log("step 0 validated");           
                    }                    

                    toggleStepError(0, "hide");
                    connection.trigger('nextStep');

                } else {

                    if ( debug ) {
                        console.log("step 0 not validated");           
                    }  

                    connection.trigger('ready');
                    toggleStepError(0, "show");

                }

            } else if ( currentStep.key === 'step1' ) {

                if ( validateStep(1) ) {

                    if ( debug ) {
                        console.log("step 1 validated");           
                    }                    

                    toggleStepError(1, "hide");
                    updateSummaryPage(buildActivityPayload());
                    connection.trigger('nextStep');

                } else {

                    if ( debug ) {
                        console.log("step 1 not validated");           
                    }  

                    connection.trigger('ready');
                    toggleStepError(1, "show");

                }

            } else if ( currentStep.key === 'step3' ) {

                if ( debug ) {
                    console.log("Close and save in cache");
                }
                save();

            } else {

                connection.trigger('nextStep');

            }

        } else if ( promotionType == 'instore' || promotionType == 'nocode' ) {

            if ( currentStep.key === 'step0') {

                if ( validateStep(0) ) {

                    if ( debug ) {
                        console.log("step 0 validated");           
                    }                    

                    toggleStepError(0, "hide");
                    connection.trigger('nextStep');

                } else {

                    if ( debug ) {
                        console.log("step 0 not validated");           
                    }  

                    connection.trigger('ready');
                    toggleStepError(0, "show");

                }

            } else if ( currentStep.key === 'step2' ) {

                if ( validateStep(2) ) {

                    if ( debug ) {
                        console.log("step 2 validated");           
                    }                    

                    toggleStepError(2, "hide");
                    updateSummaryPage(buildActivityPayload());
                    connection.trigger('nextStep');

                } else {

                    if ( debug ) {
                        console.log("step 2 not validated");           
                    }  

                    connection.trigger('ready');
                    toggleStepError(2, "show");

                }

            } else if ( currentStep.key === 'step3' ) {

                if ( debug ) {
                    console.log("Close and save in cache");
                }
                save();      

            } else {

                connection.trigger('nextStep');
            }

        } else if ( promotionType == 'online_instore' ) {
            
            
            if ( currentStep.key === 'step0') {

                if ( validateStep(0) ) {

                    if ( debug ) {
                        console.log("step 0 validated");           
                    }                    

                    toggleStepError(0, "hide");
                    connection.trigger('nextStep');

                } else {

                    if ( debug ) {
                        console.log("step 0 not validated");           
                    }  

                    connection.trigger('ready');
                    toggleStepError(0, "show");

                }

            } else if ( currentStep.key === 'step2') {

                if ( validateStep(2) ) {

                    if ( debug ) {
                        console.log("step 2 validated");           
                    }                    

                    updateSummaryPage(buildActivityPayload());
                    toggleStepError(2, "hide");
                    connection.trigger('nextStep');

                } else {

                    if ( debug ) {
                        console.log("step 2 not validated");           
                    }  

                    connection.trigger('ready');
                    toggleStepError(2, "show");

                }

            } else if ( currentStep.key === 'step3' ) {

                if ( debug ) {
                    console.log("Close and save in cache");
                }
                save();

            } else if ( currentStep.key === 'step1' ) {

                if ( validateStep(1) ) {

                    if ( debug ) {
                        console.log("step 1 validated");           
                    }                    

                    toggleStepError(1, "hide");
                    connection.trigger('nextStep');

                } else {

                    if ( debug ) {
                        console.log("step 1 not validated");           
                    }  

                    connection.trigger('ready');
                    toggleStepError(1, "show");

                }

            } else {

                connection.trigger('nextStep');

            }

        } 

    }

    function onClickedBack () {
        connection.trigger('prevStep');
    }

    function onGotoStep (step) {

        if ( debug ) {
            console.log(step);
        }
        
        showStep(step);
        connection.trigger('ready');

    }

    function showStep(step, stepIndex) {

        if ( debug ) {
            console.log(step);
            console.log(stepIndex);
        }

        if (stepIndex && !step) {
            step = steps[stepIndex];
        }

        currentStep = step;

        if ( debug ) {
            console.log(currentStep);
        }

        $('.step').hide();

        switch(currentStep.key) {
            case 'step0':
                if ( debug ) {
                    console.log("step0 case hit");
                }
                $('#step0').show();
                connection.trigger('updateButton', {
                    button: 'next',
                    //enabled: Boolean(getMessage())
                });
                connection.trigger('updateButton', {
                    button: 'back',
                    visible: false
                });
                break;
            case 'step1':

                if ( debug ) {
                    console.log("step 1 case clicked");
                }

                $('#step1').show();
                connection.trigger('updateButton', {
                    button: 'back',
                    visible: true
                });
                if (onlineSetupStepEnabled) {
                    connection.trigger('updateButton', {
                        button: 'next',
                        text: 'next',
                        visible: true
                    });
                } else {
                    connection.trigger('updateButton', {
                        button: 'next',
                        text: 'next',
                        visible: true
                    });
                }
                break;
            case 'step2':

                if ( debug ) {
                    console.log("step 2 case clicked");
                }

                $('#step2').show();
                connection.trigger('updateButton', {
                     button: 'back',
                     visible: true
                });
                if (instoreSetupStepEnabled) {
                    connection.trigger('updateButton', {
                        button: 'next',
                        text: 'next',
                        visible: true
                    });
                } else {
                    connection.trigger('updateButton', {
                        button: 'next',
                        text: 'next',
                        visible: true
                    });
                }
                break;
            case 'step3':

                if ( debug ) {
                    console.log("step 3 case clicked");
                }

                $('#step3').show();
                connection.trigger('updateButton', {
                    button: 'next',
                    text: 'done'
                    //enabled: Boolean(getMessage())
                });
                connection.trigger('updateButton', {
                    button: 'back',
                    visible: true
                });
                break;
        }
    }

    /*
     * Function add data to data extension
     */

    function saveToDataExtension(payloadToSave) {

        if ( debug ) {
            console.log("Data Object to be saved is: ");
            console.log(payloadToSave);
        }

        try {
            $.ajax({ 
                url: '/dataextension/add',
                type: 'POST',
                data: JSON.stringify(payloadToSave),
                contentType: 'application/json',                     
                success: function(data) {
                    console.log('success');
                    console.log(data);
                    $("#promotion_key_hidden").val(data);
                    $(".promotion_key_sql").html(data);
                    $("#main_setup_key").html(data);
                    $("#control_action_test").html("Data has been saved");
                    $("#control_action_test").prop('disabled', true);
                    $("#control_action_update").prop('disabled', false);
                    $("#control_action_optima").prop('disabled', false);
                }
                , error: function(jqXHR, textStatus, err){
                    if ( debug ) {
                        console.log(err);
                    }
                }
            }); 
        } catch(e) {
            console.log("Error saving data");
            console.log(e);
        }

    }

    /*
     * Function add data to data extension
     */

    function updateExistingPromotion(hiddenPromotionKey, payloadToSave) {

        if ( debug ) {
            console.log("Data Object to be updated is: ");
            console.log(payloadToSave);
        }

        try {
            $.ajax({ 
                url: '/dataextension/update-existing',
                type: 'POST',
                data: JSON.stringify(payloadToSave),
                contentType: 'application/json',                     
                success: function(data) {
                    console.log('success');
                    console.log(data);
                    $("#control_action_update").html("Update saved");
                    $("#control_action_test").prop('disabled', true);
                    $("#control_action_update").prop('disabled', false);
                    $("#control_action_optima").prop('disabled', false);
                }
                , error: function(jqXHR, textStatus, err){
                    if ( debug ) {
                        console.log(err);
                    }
                }
            }); 
        } catch(e) {
            console.log("Error saving data");
            console.log(e);
        }

    }

    function setLive(hiddenPromotionKey) {
        if ( debug ) {
            console.log("Key for updates is: ");
            console.log(hiddenPromotionKey);
        }

        var updateNode = [];
        updateNode["key"] = hiddenPromotionKey;

        updateNode.push({
            key: hiddenPromotionKey
        });

        console.log("Update node is");
        console.log(updateNode);

        try {
            $.ajax({ 
                url: '/dataextension/set-live',
                type: 'POST',
                data: JSON.stringify(updateNode),
                contentType: 'application/json',                     
                success: function(data) {
                    console.log('update sent');
                    console.log(data);
                    $("#control_action_optima").prop('disabled', true);
                    $("#control_action_update").prop('disabled', true);
                    $("#promotion_state_hidden").val(true);

                }
                , error: function(jqXHR, textStatus, err){
                    if ( debug ) {
                        console.log(err);
                    }
                }
            }); 
        } catch(e) {
            console.log("Error updating data");
            console.log(e);
        }
    }

    function addPromotionKeyToArgs(saveResponse) {
        if ( debug ){
            console.log("add promokey to args executed");
            console.log(saveResponse);
        }
    }

    function buildActivityPayload() {

        var step1FormInputs = $("#step0").find(":input");
        var step2FormInputs = $("#step1").find(":input");
        var step3FormInputs = $("#step2").find(":input");

        var i;
        var payloadNode = [];

        for ( i = 0; i < step1FormInputs.length; i++ ) {
            if ( step1FormInputs[i].id) {
                if ( step1FormInputs[i].type == "checkbox") {
                    if ( step1FormInputs[i].checked ) {
                        payloadNode.push({
                            step: 1,
                            key: step1FormInputs[i].id, 
                            value:  true,
                            type: "checkbox"
                        });
                    } else {
                        payloadNode.push({
                            step: 1,
                            key: step1FormInputs[i].id, 
                            value:  false,
                            type: "checkbox"
                        });                        
                    }
                } else if ( step1FormInputs[i].type == "radio" ) {
                    if ( step1FormInputs[i].checked ) {
                        payloadNode.push({
                            step: 1,
                            key: step1FormInputs[i].name, 
                            value:  step1FormInputs[i].value,
                            type: "radio"
                        });
                    }
                } else {
                    if ( step1FormInputs[i].value ) {
                        payloadNode.push({
                            step: 1,
                            key: step1FormInputs[i].id, 
                            value:  step1FormInputs[i].value,
                            type: "input"
                        });  
                    }
                }
            }
        }

        for ( i = 0; i < step2FormInputs.length; i++ ) {
            if ( step2FormInputs[i].id) {
                if ( step2FormInputs[i].type == "checkbox") {
                    if ( step2FormInputs[i].checked ) {
                        payloadNode.push({
                            step: 2,
                            key: step2FormInputs[i].id, 
                            value:  true,
                            type: "checkbox"
                        });
                    } else {
                        payloadNode.push({
                            step: 2,
                            key: step2FormInputs[i].id, 
                            value:  false,
                            type: "checkbox"
                        });                        
                    }
                } else if ( step2FormInputs[i].type == "radio" ) {
                    if ( step2FormInputs[i].checked ) {
                        payloadNode.push({
                            step: 2,
                            key: step2FormInputs[i].name, 
                            value:  step2FormInputs[i].value,
                            type: "radio"
                        });
                    }
                } else {
                    if ( step2FormInputs[i].value ) {
                        payloadNode.push({
                            step: 2,
                            key: step2FormInputs[i].id, 
                            value:  step2FormInputs[i].value,
                            type: "input"
                        });                       
                    }
                }
            }
        }

        for ( i = 0; i < step3FormInputs.length; i++ ) {
            if ( step3FormInputs[i].id) {
                if ( step3FormInputs[i].type == "checkbox") {
                    if ( step3FormInputs[i].checked ) {
                        payloadNode.push({
                            step: 3,
                            key: step3FormInputs[i].id, 
                            value:  true,
                            type: "checkbox"
                        });
                    } else {
                        payloadNode.push({
                            step: 3,
                            key: step3FormInputs[i].id, 
                            value:  false,
                            type: "checkbox"
                        });                        
                    }
                } else if ( step3FormInputs[i].type == "radio" ) {
                    if ( step3FormInputs[i].checked ) {
                        payloadNode.push({
                            step: 3,
                            key: step3FormInputs[i].name, 
                            value:  step3FormInputs[i].value,
                            type: "radio"
                        });
                    }
                } else {
                    if ( step3FormInputs[i].value ) {
                        payloadNode.push({
                            step: 3,
                            key: step3FormInputs[i].id, 
                            value:  step3FormInputs[i].value,
                            type: "input"
                        });                       
                    }
                }
            }
        }

        if ( debug ) {
            console.log(payloadNode);
        }

        return payloadNode;

    }

    function updateSummaryPage(summaryPayload) {

        $("#summary-main-setup, #summary-online-setup, #summary-instore-setup").empty();

        if ( debug ) {
            console.log("Build Payload for summary update it")
            console.log(summaryPayload);
        }
 
        var z = 0;

        for ( z = 0; z < summaryPayload.length; z++ ) {

            if ( summaryPayload[z].value != "no-code" || summaryPayload[z].value != false || summaryPayload[z].value != "false" ) {

                if ( summaryPayload[z].step == 1 ) {

                    if ( summaryPayload[z].key == "promotionType" ) {
                        var summaryPromotionType = summaryPayload[z].value;
                        if ( summaryPromotionType == "online") {
                            $("#summary-instore-setup").append('<p>No codes setup.</p>');
                        } else if ( summaryPromotionType == "instore" || summaryPromotionType == "nocode" ) {
                            $("#summary-online-setup").append('<p>No codes setup.</p>');
                        }
                    } else if ( summaryPayload[z].key == "promotion_key_hidden" ) {

                        $(".promotion_key_sql").text(summaryPayload[z].value);

                    } else if ( summaryPayload[z].key == "control_group" && summaryPayload[z].value != "no-code" ) {

                        console.log("Show control group block");

                        // update control DE value is SQL statement
                        $(".control_group_data_extension").text(decodeURI(summaryPayload[z].value));

                        // show control group block
                        $("#control-group-association").show();

                    }  else if ( summaryPayload[z].key == "update_contacts" && summaryPayload[z].value != "no-code" ) {

                        console.log("Show no association block");

                        // update control DE value is SQL statement
                        $(".update_contact_data_extension").text(decodeURI(summaryPayload[z].value));

                        // show association and communication SQL
                        $("#no-email-association").show();
                        $("#if028").show();


                    } else if ( summaryPayload[z].key == "promotion_state_hidden" && summaryPayload[z].value == "true" ) {

                        $("#control_action_update").prop('disabled', true);
                        $("#control_action_optima").prop('disabled', true);
                        $("#control_action_test").prop('disabled', true);
                        $("#control_action_option").html("Promotion is live");

                    }

                    $("#summary-main-setup").append('<dt class="slds-item_label slds-text-color_weak" title="'+summaryPayload[z].key+'"><b>'+cleanUpKeyText(summaryPayload[z].key)+'</b></dt>');
                    $("#summary-main-setup").append('<dd class="slds-item_detail" title="Description for '+summaryPayload[z].value+'">'+cleanUpValueText(summaryPayload[z].value)+'</dd>');

                } else if ( summaryPayload[z].step == 2 ) {

                    if ( summaryPromotionType == "online" || summaryPromotionType == "online_instore" ) {

                        $("#summary-online-setup").append('<dt class="slds-item_label slds-text-color_weak" title="'+summaryPayload[z].key+'"><b>'+cleanUpKeyText(summaryPayload[z].key)+'</b></dt>');
                        $("#summary-online-setup").append('<dd class="slds-item_detail" title="Description for '+summaryPayload[z].value+'">'+summaryPayload[z].value+'</dd>');

                    }              

                } else if ( summaryPayload[z].step == 3 ) {

                    if ( summaryPromotionType == "instore" || summaryPromotionType == "online_instore" || summaryPromotionType == "nocode" ) {

                        $("#summary-instore-setup").append('<dt class="slds-item_label slds-text-color_weak" title="'+summaryPayload[z].key+'"><b>'+cleanUpKeyText(summaryPayload[z].key)+'</b></dt>');
                        $("#summary-instore-setup").append('<dd class="slds-item_detail" title="Description for '+summaryPayload[z].value+'">'+summaryPayload[z].value+'</dd>');
                    
                    }     
                }
            }
        }  
    }

    function cleanUpKeyText(keyString) {
        return keyString.split("_").join(" ");
    }

    function cleanUpValueText(valueString) {
        return decodeURI(valueString);
    }

    function save() {

        var buildPayload = buildActivityPayload();

        // replace with res from save to DE function

        if (debug) {
            console.log("Build Payload is:");
            console.log(JSON.stringify(buildPayload));
            console.log(buildPayload.promotion_key);
        }

        var argPromotionKey;

        for ( var w = 0; w < buildPayload.length; w++ ) {
            console.log("inside build payload loop");
            console.log(buildPayload[w]);
            if ( buildPayload[w].key == "promotion_key_hidden") {
                argPromotionKey = buildPayload[w].value;
            }
        }

        console.log("arg key");
        console.log(argPromotionKey); 

        // 'payload' is initialized on 'initActivity' above.
        // Journey Builder sends an initial payload with defaults
        // set by this activity's config.json file.  Any property
        // may be overridden as desired.
        payload.name = $("#campaign_name").val();
        var promoState = $("#promotion_state_hidden").val();

        payload['arguments'].execute.inArguments = [{buildPayload}];

        // set isConfigured to true
        if ( argPromotionKey && promoState ) {
            // sent to de and configured
            payload['metaData'].isConfigured = true;
        } else {
            // not sent to de but configured
            payload['metaData'].isConfigured = false;
        }

        if ( debug ) {
            console.log("Payload including in args")
            console.log(payload.arguments.execute.inArguments);
        }

        // trigger payload save
        connection.trigger('updateActivity', payload);
    }

});