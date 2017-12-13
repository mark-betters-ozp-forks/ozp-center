'use strict';

var Reflux = require('reflux');
var _ = require('../utils/_');
var NotificationActions = require('../actions/NotificationActions.js');
var PaginatedList = require('../utils/PaginatedList.js');
var _notifications;

var ActiveNotificationStore = Reflux.createStore({

    init() {
        _notifications = new PaginatedList();
        this.listenTo(NotificationActions.fetchActiveCompleted, this.fetchActiveCompleted);
        this.listenTo(NotificationActions.createNotificationCompleted, this.onCreateCompleted);
        this.listenTo(NotificationActions.expireNotificationCompleted, this.onExpireCompleted);
    },

    getNotifications() {
        return _notifications;
    },

    fetchActiveCompleted(notifications) {
        _notifications.receivePage(notifications);
        this.trigger();
    },

    onCreateCompleted(uuid, notification) {
        _notifications.data.unshift(notification);
        this.trigger();
    },

    onExpireCompleted(notification) {
        _.remove(_notifications.data, { id: notification.id });
        this.trigger();
    }

});

module.exports = ActiveNotificationStore;
