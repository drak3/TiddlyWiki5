/*\
title: $:/plugins/tiddlywiki/minimal-web/webadaptor.js
type: application/javascript
module-type: syncadaptor

A sync adaptor module for synchronising with a simple REST api

\*/

//note that this prelude is needed to be loaded as sync adapter!!!

/*
 * Implements a tiny client for a minimal REST api basically forwarding the functions directly to the server
 * Endpoints
 * /tiddlers.json
 *  GET: returns skinny list of tiddlers (text optional, if text is provided it is loaded, useful for Macros or to include things in local search)
 * /tiddlers/tiddler-name
 *  GET: return full tiddler
 *  PUT: store full tiddler
 *  DELETE: delete full tiddler
 *
 * Planned (?):
 *
 * /login
 *  POST: with username and password
 * /logout
 *  POST: empty body
 * /status
 *  GET: get a simple status message as json (logged_in, user, ok)
 */

(function(){

    //"use strict";
    
    //constructur
    function WebAdaptor(options) {
        this.wiki = options.wiki;
        //not yet configurable: simply use current location
        var paths = document.location.pathname.split('/');
        paths.splice(-1, 1); //delete last element, html file name
        this.basePath = document.location.protocol + '//' + document.location.host + paths.join('/');
    };

    WebAdaptor.prototype.name = "web";

    //documentation at https://tiddlywiki.com/dev/#SyncAdaptorModules
    //See core/modules/syncer.js for how these functions are used
    
    //required functions


    /*
     * Adapter is only run when isReady returns true
     */
    WebAdaptor.prototype.isReady = function() {
        return true;
    };

    /*
     * Gets the supplemental information that the adaptor needs to keep track of for a particular tiddler. 
     * For example, the TiddlyWeb adaptor includes a bag field indicating the original bag of the tiddler.
     *
     * Returns an object storing any additional information required by the adaptor.
     */
    WebAdaptor.prototype.getTiddlerInfo = function(tiddler) {
        return {} //do not need to maintain additional info
    };

    /*
     * Saves a tiddler to the server.
     * Parameters
     * tiddler: Tiddler to be saved
     * callback: Callback function invoked with parameter err,adaptorInfo,revision
     * tiddlerInfo: The tiddlerInfo maintained by the syncer for this tiddler
     */
    WebAdaptor.prototype.saveTiddler = function(tiddler, callback, tiddlerInfo) {
        var self = this;

        $tw.utils.httpRequest({
            url: self.basePath + '/tiddlers/' + encodeURIComponent(tiddler.fields.title),
            type: "PUT",
            headers: {
                "Content-type": "application/json"
            },
            data: JSON.stringify(tiddler),
            callback: function(err, data, request) {
                if(err) {
                    return callback(err); //pass error on to syncer
                }
                callback(null) //pass on without error, we do not have extra data or revision info
            }
        });
    };

    /*
     * Loads a tiddler from the server.
     * 
     * Parameters
     * title: Title of tiddler to be retrieved
     * callback: Callback function invoked with parameter err,tiddlerFields
     */
    WebAdaptor.prototype.loadTiddler = function(title, callback) {
        var self = this;

        $tw.utils.httpRequest({
            url: self.basePath + "/tiddlers/" + encodeURIComponent(title),
            callback: function(err, data, request) {
                if(err) {
                    return callback(err);
                }
                callback(null, JSON.parse(data));
            }
        });
    };

    /*
     * Delete a tiddler from the server.
     * 
     * Parameters
     * title: Title of tiddler to be deleted
     * callback: Callback function invoked with parameter err
     * tiddlerInfo: The tiddlerInfo maintained by the syncer for this tiddler
     */
    WebAdaptor.prototype.deleteTiddler = function(title, callback, tiddlerInfo) {
        var self = this;

        $tw.utils.httpRequest({
            url: self.basePath + "/tiddlers/" + encodeURIComponent(title),
            type: "DELETE",
            callback: function(err, data, request) {
                callback(err);
            }
        });
    };

    //optional functions

    /*
     * Retrieves status information from the server. This method is optional.
     * 
     * Parameters
     * callback: Callback function invoked with parameters err,isLoggedIn,username
     */
    WebAdaptor.prototype.getStatus = function(callback) {
        var self = this;
        try{
        $tw.utils.httpRequest({
            url: self.basePath + "/status",
            callback: function(err, data, request) {
                //this will fail silently if the status endpoint is either not implemented or gives bad data
                //failing should be indistinguishible from the case where we do not define getStatus
                if(err) {
                    return callback(null, true, "UNAUTHENTICATED");
                }

                try {
                    data = JSON.parse(data)
                } catch(err) {
                    return callback(null, true, "UNAUTHENTICATED");
                }

                //we could use the status message to get some info for ourselves
                //  readonly: set wiki into read only mode, i.e. make saveTiddler and deleteTiddler fail silently (could be changed on login)

                if( data.isLoggedIn == undefined || data.username == undefined) {
                    return callback(null, true, "UNAUTHENTICATED")
                }
                return callback(null, data.isLoggedIn, data.username);
            }
        });} catch(err) {
            
        }
    };

    /*
     * Attempts to login to the server with specified credentials. This method is optional.
     * 
     * Parameters
     * username: Username
     * password: Password
     * callback: Callback function invoked with parameter err
     */
    WebAdaptor.prototype.login = function(username, password, callback) {
        var self = this;
        $tw.utils.httpRequest({
            url: self.basePath + "/login",
            type: "POST",
            data: {
                user: username,
                password: password
            },
            callback: function(err) {
                callback(err);
            }
        });
    };

    /*
     * Attempts to logout of the server. This method is optional.
     * 
     * Parameters
     * callback: Callback function invoked with parameter err
     */
    WebAdaptor.prototype.logout = function(callback) {
        var self = this;
        $tw.utils.httpRequest({
            url: sel.basePath + "/logout",
            type: "POST",
            callback: function(err, data) {
                callback(err);
            }
        });
    };
    
    /*
     * Retrieves a list of skinny tiddlers from the server.
     * This method is optional. If an adaptor doesn't implement it then synchronisation will be unidirectional from the TiddlyWiki store to the adaptor, but not the other way.
     * 
     * Parameters
     * callback: Callback function invoked with parameter err,tiddlers, where tiddlers is an array of tiddler field objects
     */
    WebAdaptor.prototype.getSkinnyTiddlers = function(callback) {
        var self = this;
        //TODO: we could add a fat=1 in case this is the first request we make so the server can supply stuff like Macros or text-tiddlers for offline search
        $tw.utils.httpRequest({
            url: this.basePath + "/tiddlers.js",
            callback: function(err, data) {
                if(err) {
                    return callback(err);
                }
                return JSON.parse(data)
            }
        });
    };



    //activate only if we are in a browser context and served via web
    if($tw.browser && document.location.protocol.substr(0,4) === "http") {
        exports.adaptorClass = WebAdaptor;
    }
})();
