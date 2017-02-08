'use strict';

var Reflux = require('reflux');
var ListingActions = require('../actions/ListingActions');
var {listingCreated} = require('../actions/CreateEditActions');

var _listingsCache = {};
var _listingsByOwnerCache = [];
var _allListings = [];
var _changeLogsCache = {};
var _reviewsCache = {};

function updateCache (listings) {
    listings.forEach(function (listing) {
        var prev = _listingsCache[listing.id];

        if (prev) {
            listing.changeLogs = prev.changeLogs;
        }
            _listingsCache[listing.id] = listing;
    });
}

function updateOwnerCache (listings) {
    _listingsByOwnerCache = listings;
}

function updateCacheFromPaginatedResponse (listingsAsPaginatedResponse) {
    var listings = listingsAsPaginatedResponse.getItemAsList();
    updateCache(listings);
}

var GlobalListingStore = Reflux.createStore({

    /**
    * Update local listingsCache when new data is fetched
    **/
    init: function () {
        this.listenTo(ListingActions.fetchStorefrontListingsCompleted, function(storefront) {
            updateCache(storefront.featured);
            updateCache(storefront.newArrivals);
            updateCache(storefront.mostPopular);
        });
        this.listenTo(ListingActions.searchCompleted, updateCacheFromPaginatedResponse);
        this.listenTo(ListingActions.fetchAllListingsCompleted, function (filter, response) {
            var listings = response.getItemAsList();
            updateCache(listings);
            _allListings = (_allListings || []).concat(listings);
            this.trigger();
        });
        this.listenTo(ListingActions.listingChangeCompleted, function (listingId) {
            ListingActions.fetchChangeLogs(listingId)
        });
        this.listenTo(ListingActions.fetchChangeLogsCompleted, function (id, changeLogs) {
            _changeLogsCache[id] = changeLogs;
            this.trigger();
        });
        this.listenTo(ListingActions.fetchReviewsCompleted, function (id, reviews) {
            _reviewsCache[id] = reviews;
            this.trigger();
        });
        this.listenTo(ListingActions.fetchOwnedListingsCompleted, (listings)=>{
            updateOwnerCache(listings);
            this.trigger();
        });
        this.listenTo(ListingActions.fetchAllListingsAtOnceCompleted, function (filter, response) {
            var listings = response.getItemAsList();
            updateCache(listings);
            _allListings = (_allListings || []).concat(listings);
            this.trigger();
        });
        this.listenTo(ListingActions.saveCompleted, function (isNew, listing) {
            updateCache([listing]);
            if (isNew) {
                listingCreated(listing);
            }
            //ListingActions.fetchChangeLogs(listing.id);
            this.trigger();
        });
        this.listenTo(ListingActions.rejectCompleted, function (listingId, rejection) {
            var listing = _listingsCache[listingId];
            listing.rejection = rejection;
            listing.approvalStatus = 'REJECTED';
            //ListingActions.fetchChangeLogs(listing.id);
            this.trigger();
        });
        this.listenTo(ListingActions.pendingDeleteCompleted, function (data) {
          var listing = data;
          listing.owners.forEach(function (owner) {
              var ownedListings = _listingsByOwnerCache.filter(function (item) {
                  return item.id !== listing.id;
              });
              _listingsByOwnerCache = ownedListings;
          });
          //ListingActions.fetchChangeLogs(listing.id);
          this.trigger();
        });
        this.listenTo(ListingActions.fetchByIdCompleted, function (data) {
            updateCache([data]);
            this.trigger();
        });
        this.listenTo(ListingActions.deleteListingCompleted, function (data) {
            var listing = data;

            listing.owners.forEach(function (owner) {
                var ownedListings = _listingsByOwnerCache.filter(function (item) {
                    return item.id !== listing.id;
                });
                _listingsByOwnerCache = ownedListings;
            });
            //ListingActions.fetchChangeLogs(listing.id);
            this.trigger();
        });

    },

    getById: function (id) {
        if (!_listingsCache[id]) {
            ListingActions.fetchById(id);
            return null;
        }
        return _listingsCache[id];
    },

    getCache: function () {
        return _listingsCache;
    },

    getByOwner: function (profile) {
        return _listingsByOwnerCache;
    },

    getAllListings: function () {
        return _allListings;
    },

    getChangeLogsForListing: function (id) {
        if(!_changeLogsCache[id]) {
            ListingActions.fetchChangeLogs(id);
            return null;
        }
        return _changeLogsCache[id];
    },

    getReviewsForListing: function (listing) {
        if(!_reviewsCache[listing.id]) {
            ListingActions.fetchReviews(listing);
            return null;
        }
        return _reviewsCache[listing.id];
    }

});

module.exports = GlobalListingStore;
