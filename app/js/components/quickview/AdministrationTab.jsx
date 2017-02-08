'use strict';

var Reflux = require('reflux');
var React = require('react');
var _ = require('../../utils/_');
var ChangeLogs = require('./ChangeLogs.jsx');
var GlobalListingStore = require('../../stores/GlobalListingStore')
var ListingActions = require('../../actions/ListingActions');
var fetchChangeLogs = ListingActions.fetchChangeLogs;
var rejectListing = ListingActions.reject;
var enableListing = ListingActions.enable;
var disableListing = ListingActions.disable;
var approveListingByOrg = ListingActions.approveByOrg;
var approveListing = ListingActions.approve;
var listingStatus = require('ozp-react-commons/constants').approvalStatus;
var { UserRole } = require('ozp-react-commons/constants');
var { form, Str, subtype, struct } = require('tcomb-form');

var Toggle = React.createClass({
    propTypes: {
        listing: React.PropTypes.object
    },

    render: function () {
        var title = this.props.title;

        return (
            <section className={this.props.className}>
                <h5>{title}</h5>
                <p>{this.props.description}</p>
                <label className="switchLabel">{this.props.label || title}:</label>
                    <label className="switch"><input type="checkbox" ref="checkbox" className="ios brand-success"
                        checked={this.props.checked} onChange={this.props.onChange} />
                    <div className="track"><div className="knob"></div></div>
                    </label>

            </section>
        );
    }
});

var EnabledControl = React.createClass({
    shouldComponentUpdate: function (newProps) {
        return newProps.listing.isEnabled !== this.props.isEnabled;
    },

    render: function () {
        var listing = this.props.listing,
            enabled = listing.isEnabled,
            title = enabled ? 'Enabled' : 'Disabled',
            description = 'This listing is ' + (enabled ? '' : 'not') + ' visible to users',
            onChange = enabled ? disableListing.bind(null, listing) :
                enableListing.bind(null, listing);

        return (
            <Toggle title={title} label="Enabled" className="enabled-toggle"
                description={description}
                checked={enabled}
                onChange={onChange}/>
        );
    }
});

var FeaturedControl = React.createClass({
    onChange: function (evt) {
        ListingActions.setFeatured(evt.target.checked, this.props.listing);
    },

    shouldComponentUpdate: function (newProps) {
        return newProps.listing.isFeatured !== this.props.isFeatured;
    },

    render: function () {
        var listing = this.props.listing,
            featured = listing.isFeatured,
            title = 'Featured',
            description = 'This listing is ' + (featured ? '' : 'not') +
                ' featured on the Discovery Page';

        return (
            <Toggle title={title} label="Featured" className="featured-toggle"
                description={description}
                checked={featured}
                onChange={this.onChange}/>
        );
    }
});

var AdministrationTab = React.createClass({
    mixins: [
      Reflux.listenTo(ListingActions.listingChangeCompleted, 'onListingChangeCompleted'),
    ],
    propTypes: {
        listing: React.PropTypes.object.isRequired
    },

    getInitialState: function () {
        return { editingRejection: false };
    },

    componentWillReceiveProps: function (newProps) {
        if (this.props.listing.id !== newProps.listing.id) {
            fetchChangeLogs(newProps.listing.id);
        }
    },

    componentWillMount: function () {
        if (this.props.listing.id) {
            fetchChangeLogs(this.props.listing.id);
        }
    },

    onListingChangeCompleted: function(){
      fetchChangeLogs(this.props.listing.id);
    },

    render: function () {
        return (
            <div className="tab-pane active Quickview__ChangeLog row">
                { this.renderStatus() }
                <div className="col-xs-8 col-right">
                    <section>
                        <h5>Listing Changes</h5>
                        <ChangeLogs showListingName={ false } org={this.props.listing.agency}/>
                    </section>
                </div>
            </div>
        );
    },

    renderStatus: function () {
        var listing = this.props.listing,
            status = listingStatus[listing.approvalStatus],
            statusText = status,
            isAdmin = UserRole[this.props.currentUser.highestRole] >= UserRole.APPS_MALL_STEWARD,
            isStewardOfOrg = _.contains(this.props.currentUser.stewardedOrganizations, listing.agencyShort),
            controls, statusClass, iconClass;

        switch (status) {
            case 'Published':
                var enabledControl =
                        <EnabledControl key="enabled" listing={this.props.listing} />;

                controls = isAdmin ? [
                        enabledControl,
                        <FeaturedControl key="featured" listing={this.props.listing} />
                    ] : [enabledControl];

                statusClass = 'label-published';
                iconClass= 'icon-thumbs-up-14';
                break;
            case 'Pending, Organization':
                if (isStewardOfOrg) {
                    controls = this.renderReviewSection();
                    statusClass = 'label-needs-action';
                    iconClass= 'icon-exclamation-14';

                } else if (isAdmin) {
                    controls = this.renderReviewSection();
                    statusClass = 'label-pending';
                    iconClass= 'icon-loader-14';

                } else {
                    controls = [];
                    statusClass = 'label-pending';
                    iconClass= 'icon-loader-14';

                }
                break;
            case 'Pending Deletion':
                if (isStewardOfOrg) {
                    controls = this.renderReviewSection();
                    statusClass = 'label-needs-action';
                    iconClass= 'icon-delete-14-redOrangeDark';

                } else if (isAdmin) {
                    controls = this.renderReviewSection();
                    statusClass = 'label-pending';
                    iconClass= 'icon-delete-14-redOrangeDark';

                } else {
                    controls = this.renderReviewSection();
                    statusClass = 'label-pending';
                    iconClass= 'icon-delete-14-redOrangeDark';

                }
                break;
            case 'Pending, Center':
                if (isAdmin) {
                    controls = this.renderReviewSection();
                    statusClass = 'label-needs-action';
                    iconClass= 'icon-exclamation-14';

                } else {
                    controls = [];
                    statusClass = 'label-pending';
                    iconClass= 'icon-loader-14';

                }
                break;

            case 'Returned to Owner':
                statusClass = 'label-needs-action';
                iconClass= 'icon-exclamation-14';

                controls = [];
                break;

            case 'Draft':
                statusClass = 'label-draft';
                iconClass= 'icon-paper-14';

                controls = [];
                break;
        }

        return (
            <div className="col-xs-4 col-left ListingAdmin__Controls">
                <section>
                    <h5>Listing Status</h5>
                    <p className={statusClass}><i className={iconClass} />{ statusText }</p>
                </section>
                { controls }
            </div>
        );
    },

    renderReviewSection: function () {
        var editing = this.state.editingRejection;

        var Justification = form.createForm(
            struct({ description: subtype(Str, s => s.length >= 1 && s.length <= 2000) }),
            { fields: { description: {
                type: 'textarea',
                message: 'A justification is required. It can be up to 2000 characters in length.'
            }}}
        );

        var isAdmin = UserRole[this.props.currentUser.highestRole] >= UserRole.APPS_MALL_STEWARD,
            isStewardOfOrg = _.contains(this.props.currentUser.stewardedOrganizations, this.props.listing.agencyShort),
            pendingOrg = (listingStatus[this.props.listing.approvalStatus] === 'Pending, Organization')  ? true : false,
            pendingAdmin = (listingStatus[this.props.listing.approvalStatus] === 'Pending, Center') ? true : false,
            pendingDelete = (listingStatus[this.props.listing.approvalStatus] === 'Pending Deletion')  ? true : false,
            agency = this.props.listing.agencyShort;

        if (editing) {
            return (
                <section className="return-feedback">
                    <h5>Return to Owner Feedback</h5>
                    <p>Please provide feedback for the listing owner about what they should do to make this listing ready for publication</p>
                    <form>
                        <Justification ref="justification" />
                        <button type="button" className="btn btn-default" onClick={ this.cancelRejection }>Cancel</button>
                        <button type="button" className="btn btn-warning" onClick={ this.returnToOwner }>Return to Owner</button>
                    </form>
                </section>
            );
        } else {
            if (pendingDelete){
              if(isAdmin && !isStewardOfOrg) {
                return (
                    <section className="review-listing">
                        <h5>{"Listing Pending Deletion"}</h5>
                        <button type="button" className="btn btn-success" onClick={ this.approveDelete }>{"Approve deletion for " + agency}</button>
                        <button type="button" className="btn btn-warning" onClick={ this.editRejection }>{"Reject deletion for " + agency}</button>
                    </section>
                );
              } else if(isStewardOfOrg) {
                  return (
                      <section className="review-listing">
                         <h5>Review Listing</h5>
                          <button type="button" className="btn btn-success" onClick={ this.approveDelete }>Approve deletion</button>
                          <button type="button" className="btn btn-warning" onClick={ this.editRejection }>Return to Owner</button>
                       </section>
                  );
              }
            }
            if(pendingOrg) {
                if(isAdmin && !isStewardOfOrg) {
                   var org = this.props.listing.agencyShort;
                    return (
                        <section className="review-listing">
                            <h5>{"Review Listing for " + org}</h5>
                            <button type="button" className="btn btn-success" onClick={ this.approve }>{"Approve for " + agency}</button>
                            <button type="button" className="btn btn-warning" onClick={ this.editRejection }>{"Reject for " + agency}</button>
                        </section>
                    );
                } else if(isStewardOfOrg) {
                    return (
                        <section className="review-listing">
                           <h5>Review Listing</h5>
                            <button type="button" className="btn btn-success" onClick={ this.approve }>Approve</button>
                            <button type="button" className="btn btn-warning" onClick={ this.editRejection }>Return to Owner</button>
                         </section>
                    );
                }
            }

            if(pendingAdmin) {
                if(isAdmin) {
                    return (
                        <section className="review-listing">
                           <h5>Review Listing</h5>
                            <button type="button" className="btn btn-success" onClick={ this.approve }>Approve</button>
                            <button type="button" className="btn btn-warning" onClick={ this.editRejection }>Return to Owner</button>
                         </section>
                    );
                }
            }
        }
    },

    editRejection: function (event) {
        event.preventDefault();
        this.setState({ editingRejection: true });
    },

    returnToOwner: function (event) {
        event.preventDefault();
        var justification = this.refs.justification.getValue();
        if (justification) {
            rejectListing(this.props.listing.id, justification.description);
            this.setState({ editingRejection: false });
        }
    },

    cancelRejection: function (event) {
        event.preventDefault();
        this.setState({ editingRejection: false });
    },

    approve: function (event) {
        event.preventDefault();
        if (listingStatus[this.props.listing.approvalStatus] === 'Pending, Organization') {
            approveListingByOrg(this.props.listing);
        } else {
            approveListing(this.props.listing);
        }
    },

    approveDelete: function (event) {
        //event.preventDefault();
      ListingActions.deleteListing(this.props.listing);
    }

});

module.exports = AdministrationTab;
