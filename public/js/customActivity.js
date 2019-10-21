define([
    'postmonger'
], function(
    Postmonger
) {
    'use strict';

    var debug                       = true;
    var connection                  = new Postmonger.Session();
    var payload                     = {};
    var onlineSetupStepEnabled      = false;
    var instoreSetupStepEnabled     = false;
    var steps                       = [
        { "label": "Step 0", "key": "step0" },
        { "label": "Step 1", "key": "step1", "active": false },
        { "label": "Step 2", "key": "step2", "active": false },
        { "label": "Step 3", "key": "step3" }
    ];
    var currentStep = steps[0].key;

    if ( debug ) {
        console.log("Current Step is: " + currentStep);
    }

    $(window).ready(onRender);

    connection.on('initActivity', initialize);
    connection.on('requestedTokens', onGetTokens);
    connection.on('requestedEndpoints', onGetEndpoints);

    connection.on('clickedNext', onClickedNext);
    connection.on('clickedBack', onClickedBack);
    connection.on('gotoStep', onGotoStep);

    function getInputValue(selector, type) {
        if ( type == 'value') {
            console.log($(selector).val().trim());
            return $(selector).val().trim();
        }
    }

    function onRender() {
        var debug = true;
        // JB will respond the first time 'ready' is called with 'initActivity'
        connection.trigger('ready');

        connection.trigger('requestTokens');
        connection.trigger('requestEndpoints');

        // access promotions and build select input
        $.ajax({url: "/dataextension/lookup/offer_types", success: function(result){
            console.log('lookup offers executed');
            console.log(result.items);
            var i;
            for (i = 0; i < result.items.length; ++i) {
                // do something with `substr[i]
                $("#offer_type_online").append("<option value=" + encodeURI(result.items[i].keys.offertype) + ">" + result.items[i].keys.offertype + "</option>");
            }
        }});

        // access offer types and build select input
        $.ajax({url: "/dataextension/lookup/promotions", success: function(result){
            console.log('lookup promotions executed');
            console.log(result.items);
            var i;
            for (i = 0; i < result.items.length; ++i) {
                // do something with `substr[i]
                $("#instore_code").append("<option value=" + encodeURI(result.items[i].keys.discountid) + ">" + result.items[i].keys.discountid + "</option>");
            }
        }});


        // Toggle step 4 active/inactive
        // If inactive, wizard hides it and skips over it during navigation
        $('#toggle_step1').click(function() {
            console.log("trigger step 1");
            onlineSetupStepEnabled = !onlineSetupStepEnabled; // toggle status
            steps[1].active = !steps[1].active; // toggle active
            console.log(steps);
            connection.trigger('updateSteps', steps);
        });

        $('#toggle_step2').click(function() {
            console.log("trigger step 2");
            instoreSetupStepEnabled = !instoreSetupStepEnabled; // toggle status
            steps[2].active = !steps[2].active; // toggle active
            console.log(steps);
            connection.trigger('updateSteps', steps);
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
            console.log(clickedElement);
            var helpBlock = "#" + clickedElement[0] + "__help";
            console.log(helpBlock);
            $(helpBlock).show();
            setTimeout(function() {
                $(helpBlock).fadeOut();
                }, 5000);

            });

        $('#test-api-insert').click(function() {

            var campaign    = getInputValue('#campaign', 'value');
            var channel     = getInputValue('#channel', 'value');
            var activity    = getInputValue('#activity', 'value');
            var promotion   = getInputValue('#promotion', 'value');
            var id          = campaign + "-" + activity + "-" + channel + "-" + promotion;

            console.log("campaign = " + campaign +", channel = " + channel + ", activity = " + activity + ", promotion = " + promotion + ", id = " + id);
            
            var row = {
                "id": id,
                "campaign": campaign,
                "channel": channel,
                "activity": activity,
                "promotion": promotion
            };

            console.log(row);

            $.ajax({ 
                url: '/dataextension/add',
                type: 'POST',
                cache: false, 
                data: row, 
                success: function(data){
                    console.log(data);
                }
                , error: function(jqXHR, textStatus, err){
                    console.log(err);
                }
            });

        });
    }

    function initialize (data) {
        if (data) {
            payload = data;
        }

        if ( debug ) {
            console.log("Payload is: " + payload);
        }

        var campaignKey;
        var hasInArguments = Boolean(
            payload['arguments'] &&
            payload['arguments'].execute &&
            payload['arguments'].execute.inArguments &&
            payload['arguments'].execute.inArguments.length > 0
        );

        if ( debug ) {
            console.log("Payload arguements are: " + payload['arguements']);
        }

        var inArguments = hasInArguments ? payload['arguments'].execute.inArguments : {};

        $.each(inArguments, function(index, inArgument) {
            $.each(inArgument, function(key, val) {

                if ( debug ) {
                    console.log("The key for this row is: " + key + ". The value for this row is: " + val);
                }
                if (key === 'campaignKey') {
                    campaignKey = val;
                }
            });
        });

        // If there is no message selected, disable the next button
        if ( debug ) {
            console.log("key is: " + campaignKey);
        }
        
        /**
        if (!campaignKey) {

            showStep(null, 1);
            connection.trigger('updateButton', { button: 'next', enabled: true });

            if ( debug ) {
                console.log("You should be dumped on step1 and be forced to input values");
            }

        } else {

            if ( debug ) {
                console.log("Key in else is: " + campaignKey);
            }
            
            // update other summary values
            $('#keySummary').html(campaignKey);
            showStep(null, 2);

        }
        */

    }

    /*
     * Function add data to data extension
     */

    function saveToDataExtension() {
        var campaign    = getInputValue('#campaign', 'value');
        var channel     = getInputValue('#channel', 'value');
        var activity    = getInputValue('#activity', 'value');
        var promotion   = getInputValue('#promotion', 'value');
        var id          = campaign + "-" + activity + "-" + channel + "-" + promotion;

        console.log("campaign = " + campaign +", channel = " + channel + ", activity = " + activity + ", promotion = " + promotion + ", id = " + id);
        
        var row = {
            "id": id,
            "campaign": campaign,
            "channel": channel,
            "activity": activity,
            "promotion": promotion
        };

        console.log(row);

        $.ajax({ 
            url: '/dataextension/add',
            type: 'POST',
            cache: false, 
            data: row, 
            success: function(data){
                //console.log(data);
            }
            , error: function(jqXHR, textStatus, err){
                console.log(err);
            }
        });        
    }

    function updateSummaryPage() {

        var campaign    = getInputValue('#campaign', 'value');
        var channel     = getInputValue('#channel', 'value');
        var activity    = getInputValue('#activity', 'value');
        var promotion   = getInputValue('#promotion', 'value');
        var id          = campaign + "-" + activity + "-" + channel + "-" + promotion;
        $("#keySummary").html(decodeURI(id));     
       
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
        if ( currentStep.key === 'step4' ) {
            save();
        } else {
            connection.trigger('nextStep');
        }
    }

    function onClickedBack () {
        connection.trigger('prevStep');
    }

    function onGotoStep (step) {
        console.log(step)
        showStep(step);
        connection.trigger('ready');
    }

    function showStep(step, stepIndex) {
        if (stepIndex && !step) {
            step = steps[stepIndex-1];
        }

        currentStep = step;

        $('.step').hide();

        switch(currentStep.key) {
            case 'step0':
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
                $('#step3').show();
                break;
        }
    }

    function save() {

        var campaign    = getInputValue('#campaign', 'value');
        var channel     = getInputValue('#channel', 'value');
        var activity    = getInputValue('#activity', 'value');
        var promotion   = getInputValue('#promotion', 'value');
        var id          = campaign + "-" + activity + "-" + channel + "-" + promotion;
        var name = id;
        var value = id;

        // 'payload' is initialized on 'initActivity' above.
        // Journey Builder sends an initial payload with defaults
        // set by this activity's config.json file.  Any property
        // may be overridden as desired.
        payload.name = name;

        payload['arguments'].execute.inArguments = [{ "campaignKey": value }];

        payload['metaData'].isConfigured = true;

        connection.trigger('updateActivity', payload);

        if ( debug ) {
            console.log(payload); 
        }
    }

});
