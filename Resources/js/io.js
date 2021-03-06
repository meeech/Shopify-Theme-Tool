YUI().use('event-custom', function(Y) {
/////

var IO = YUI.namespace('Themer.IO')

    , TIMEOUT = 30000

    //At what point throttling kicks in
    , THROTTLE_THRESHOLD = 0.5

    , THROTTLE_REQUEST_MS = 500

    ;

var logReqError = function(msg, resp) {
    Ti.API.error(msg);
    Ti.API.error("status: " + resp.status);
    Ti.API.error("statusText: " + resp.statusText);
    Ti.API.error("responseText: " + resp.responseText);
};

IO.authUrl = function(shopId) {

    var u = Y.Lang.sub('https://{store}.myshopify.com/admin/oauth/authorize?client_id={app_api_key}&scope=write_themes', {
        store: shopId,
        app_api_key: APP_API_KEY
    });

    return u;
};

//@param shop ShopModel
//@param endpoint our target, like themes
IO.url = function(shopModel, endpoint) {
    return Y.Lang.sub('https://{api_key}:{password}@{store}.myshopify.com/admin/{endpoint}.json', {
        store: shopModel.get('id'),
        api_key: shopModel.get('api_key'),
        password: shopModel.get('password'),
        'endpoint': endpoint
    });
};

IO.fetchThemesList = function(shopModel, handlers) {
    Ti.API.info('io: fetchThemesList');
    var target = IO.url(shopModel, 'themes');
    Ti.API.info(target);
    IO.get(target, handlers);
};

//Filter out .css & .js files when a .css.liquid is available.
//returns array of assets to upload
var filterAssetList = function(assets) {
    var newList = [],
        toCheck = [],
        rx = /(\.css|\.js)$/;

    assets.forEach(function(item) {
        if(true === rx.test(item.key)) {
            toCheck.push(item.key);
        } else {
            newList.push(item.key);
        }
    });

    toCheck.forEach(function(item) {
        if(newList.indexOf(item.concat('.liquid')) === -1) {
            newList.push(item);
        }
    });

    return newList;
};

IO.downloadTheme = function(shopModel, themeModel) {
    console.log('IO.downloadTheme');
    var assetsListTarget = IO.url(shopModel, 'themes/'+themeModel.get('id')+'/assets');
    //Fetch the assets list
    IO.get(assetsListTarget, {
        success: function(e) {
            var ABORT = false;
            Y.Global.on('download:cancel', function() {
                ABORT = true;
            });

            var result = JSON.parse(e.responseText);

            var assetQ = new Y.Queue();
            assetQ.add.apply(assetQ, filterAssetList(result.assets));

            var toGet = assetQ.next();

            var failureGetAsset =  function(e) {

                logReqError("Failed to get asset", e);

                if(e.timedOut) {
                    growlTimedOut();
                    Y.Global.fire('download:done');
                }
                else {
                    growl({
                        title: 'Error',
                        message: "Couldn't get asset "+toGet
                    });

                    if(assetQ.size() > 0) {
                        toGet = assetQ.next();
                        if(!ABORT){
                            IO.getAsset(shopModel, themeModel, toGet, {success: successGetAsset, failure: failureGetAsset});
                        } else {
                            Y.Global.fire('download:done', {cancelled: true});
                        }
                    } else {
                        Y.Global.fire('download:done');
                    }
                }
            };

            var successGetAsset = function(e) {

                var assetRes = JSON.parse(e.responseText),
                    fileHandle = Ti.Filesystem.getFile(themeModel.get('path'), assetRes.asset.key);

                var destPath = fileHandle.nativePath().split(Ti.Filesystem.getSeparator());
                destPath.pop();
                var destinationDir = Ti.Filesystem.getFile(destPath.join(Ti.Filesystem.getSeparator()));
                if( (destinationDir.exists() == false) && (destinationDir.createDirectory() == false)) {
                    alert('We could not create the directory: ' + destPath.nativePath() + ' so we must abort.');
                    Y.Global.fire('download:error');
                    return;
                }

                if(assetRes.asset.value) {
                    fileHandle.write(assetRes.asset.value);
                } else {
                    //defined in lib/util.php - workaround for http://developer.appcelerator.com/question/128541/how-to-ticodecdecodebase64-an-image-to-write-to-disk
                    writeBase64Asset(fileHandle.nativePath(), assetRes.asset.attachment);
                }

                if(assetQ.size() > 0) {
                    toGet = assetQ.next();
                    if(!ABORT){
                        IO.getAsset(shopModel, themeModel, toGet, {success: successGetAsset, failure: failureGetAsset});
                    } else {
                        Y.Global.fire('download:done',{cancelled: true}); //hide panel
                    }
                } else {
                    Y.Global.fire('download:done');
                }
            };


            //Start the download queue...
            IO.getAsset(shopModel, themeModel, toGet, { success: successGetAsset, failure: failureGetAsset });

        },
        failure: function(e) {
            if(e.timedOut) {
                growlTimedOut();
            }
            else {
                //output error to console
                logReqError("Error: assetsList fetch", e);

                growl({
                    title: 'Error',
                    message: 'There was a problem fetching the Assets List for this theme.'
                });
            }
            Y.Global.fire('download:error');
        }
    });

};

IO.getAsset = function(shopModel, themeModel, asset, handlers) {

    var assetTarget = IO.url(shopModel, 'themes/'+themeModel.get('id')+'/assets');
    assetTarget = assetTarget.concat('?', 'asset[key]=', Ti.Network.encodeURIComponent(asset));

    Y.Global.fire('asset:download', {
        asset: asset
    });

    IO.get(assetTarget, handlers);
};

//Deploy full theme
IO.deployTheme = function(shopModel, themeModel) {
    Ti.API.warn('IO.deployTheme');

    var ABORT = false;
    Y.Global.on('upload:cancel', function() {
        ABORT = true;
    });

    var files = []
        , path = themeModel.get('path')
        , foldersOfInterest =
            [ 'assets'
            , 'config'
            , 'layout'
            , 'snippets'
            , 'templates',
            , 'templates/customers'
        ]
        , uploadQ = new Y.Queue();

    //Build the list of files
    foldersOfInterest.forEach(function(folder) {

        var dir = Ti.Filesystem.getFile(path,folder)
            , f = (dir.exists()) ? dir.getDirectoryListing() : [];

        //Tear through listing
        f.forEach(function(item) {
            //exclude folders & hidden
            if( !item.isDirectory() && !item.isHidden()) {
                uploadQ.add(item.toString());
            }
        });
    });

    //And, now chew through the q, much like we do for download theme.
    var toUpload = uploadQ.next(),

        key = toUpload.replace(path+Ti.Filesystem.getSeparator(), ''),

        errorCount = 0,

        failureSendAsset = function(e) {
            if(e.timedOut) {
                //On a timeout we dont want to continue.
                growlTimedOut();
                Y.Global.fire('deploy:done');
            } else {

                logReqError("Error deployTheme", e);

                var response = JSON.parse(e.responseText);
                var errors = response.errors || {};
                Y.each(errors, function(message) {
                    growl({
                        title: 'Error uploading',
                        message: key.concat(' - ', message)
                    });
                });
                errorCount++;
                //Then call successSendAsset to go onto the next item...
                successSendAsset();
            }
        },
        successSendAsset = function() {
            if(uploadQ.size() > 0) {
                toUpload =  uploadQ.next();
                key = toUpload.replace(path+Ti.Filesystem.getSeparator(), '');

                if(!ABORT){
                    IO.sendAsset(shopModel, themeModel, key, toUpload, {success: successSendAsset, failure: failureSendAsset});
                }
                else {
                    growl({
                        title: 'Upload Cancelled',
                        message: 'Some files were uploaded, so check your shop'
                    });
                    Y.Global.fire('deploy:done');
                }
            } else {
                var doneMessage = themeModel.get('name').concat(' has been uploaded.');
                if(errorCount > 0) {
                    Ti.API.warn('adding to message');
                    doneMessage += ("\n" + errorCount + ' ' + ((errorCount === 1)?'file':'files') +' not uploaded');
                }
                growl({
                    title: 'Deploy done!',
                    message: doneMessage
                });
                Y.Global.fire('deploy:done');
            }
        };

    IO.sendAsset(
        shopModel,
        themeModel,
        key,
        toUpload,
        {
            success: successSendAsset,
            failure: failureSendAsset
        }
    );
};

//@param shopModel
//@param themeModel
//@param assetKey
//@param filePath
IO.sendAsset = function(shopModel, themeModel, assetKey, filePath, handlers) {
    console.log('IO:sendAsset: '+assetKey);

    var assetTarget = IO.url(shopModel, 'themes/'+themeModel.get('id')+'/assets');

    //Ti throws exception when trying to read empty file,
    //but no advice given how to catch said exception. try/catch doesn't work - app still crashes,
    //To work around, we create File obj first, and check size()
    var assetFile = Ti.Filesystem.getFile(filePath),

        contents = '',

        payload = {
            "asset": {
                "key": assetKey
              }
        };

    if(0 < assetFile.size()) {
        var readfile = Ti.Filesystem.getFileStream(assetFile);
        readfile.open();
        contents = readfile.read();
    }

    if(is_binary(filePath)) {
        payload.asset.attachment = Ti.Codec.encodeBase64(contents);
    } else {
        payload.asset.value = contents.toString();
    }

    Y.Global.fire('asset:upload', {
        asset: assetKey
    });

    IO.put(assetTarget, payload, handlers);
};

// Doing some simple throttle
// Rather than  skate the edge (ie: once we get to 40/40 burst wise)
// just use more simple calc CURRENT/LIMIT > .5
// When that happens, throttle turns on, and we will limit 1req/.5s
// and allow latency to push beyond that so it slowly climbs back down.
var throttle = false;

/**
 * @param {float} value 0 to 1.
 */
var setThrottle = function(value) {
    throttle = (value > THROTTLE_THRESHOLD);
};

var getThrottle = function() {
    return throttle;
};

/**
 * @param {string} callLimit from shopify response. format: X/LIMIT
 */
var extractLimitValue = function(callLimit) {
    var regex = /^\d+\/\d+$/;
    if(!regex.test(callLimit)) {
        return 0;
    }

    var parts = callLimit.split("/");
    return parseFloat(parts[0]/parts[1]);
};

var buildxhr = function(type, handlers) {

    handlers = handlers || {};
    handlers.failure = handlers.failure || function(e) { console.log( type + ': Fail/Default Handler'); console.log(e); };
    handlers.success = handlers.success || function() { console.log( type + ': Success/Default Handler'); };

    var xhr = Ti.Network.createHTTPClient();
    xhr.setTimeout(TIMEOUT);
    xhr.onload = function(event) {

        var status = this.status || 999, //Fallback on my own code if status is null
        timedOut = event.timedOut;

        var limit = xhr.getResponseHeader("HTTP_X_SHOPIFY_SHOP_API_CALL_LIMIT");
        setThrottle(extractLimitValue(limit));

        if(timedOut || (status > 399)) {
            Ti.API.info( type + ': Failure');
            handlers.failure.call({}, event);
        } else {
            Ti.API.info( type + ': Success');
            handlers.success.call({}, event);
        }
    };

    return xhr;

};


IO.put = function(target, data, handlers) {

    var type = 'PUT';
    var xhr = buildxhr(type, handlers);

    var requestin = (getThrottle()) ? THROTTLE_REQUEST_MS : 0;

    setTimeout(function(){

        xhr.setRequestHeader('Content-Type','application/json');
        xhr.open(type, target);
        xhr.send(JSON.stringify(data));

    }, requestin);


};

IO.get = function(target, handlers) {

    var type = 'GET';
    var xhr = buildxhr(type, handlers);

    var requestin = (getThrottle()) ? THROTTLE_REQUEST_MS : 0;

    setTimeout(function(){

        xhr.open("GET",target);
        xhr.send();

    }, requestin);


};

/////
});
