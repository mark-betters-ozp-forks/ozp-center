'use strict';

var React = require('react');
var Reflux = require('reflux');
var Router = require('react-router');
var _ = require('../../utils/_');
var {CENTER_URL, API_URL} = require('ozp-react-commons/OzoneConfig');
var { PAGINATION_MAX } = require('ozp-react-commons/constants');

// actions
var ListingActions = require('../../actions/ListingActions');

// component dependencies
var NavBar = require('../NavBar/index.jsx');
var Header = require('../header/index.jsx');
var Sidebar = require('./Sidebar.jsx');
var ListingTile = require('./ListingTile.jsx');
var FeaturedListings = require('./FeaturedListings.jsx');
var Carousel = require('../carousel/index.jsx');
var Types = require('./Types.jsx');
var Organizations = require('./Organizations.jsx');
var DetailedQuery = require('./DetailedQuery.jsx');


var $ = require('jquery');
require('../../utils/typeahead.js');

// store dependencies
var DiscoveryPageStore = require('../../stores/DiscoveryPageStore');


var FILTERS = ['categories', 'type', 'agency'];

var areFiltersApplied = (state) => {
    return _.reduce(FILTERS, function (memo, filter) {
        return memo || !!state[filter].length;
    }, false);
};

var Discovery = React.createClass({

    mixins: [ Router.State, Reflux.ListenerMixin ],

    getInitialState() {
        return {
            initCategories: [],
            featured: DiscoveryPageStore.getFeatured(),
            newArrivals: DiscoveryPageStore.getNewArrivals(),
            mostPopular: DiscoveryPageStore.getMostPopular(),
            searchResults: DiscoveryPageStore.getSearchResults(),
            mostPopularTiles: 12,
            initialMostPopularTiles: 12,
            queryString: this.state ? this.state.queryString : '',
            categories: this.state ? this.state.categories : [],
            type: this.state ? this.state.type : [],
            agency: this.state ? this.state.agency : [],
            nextOffset: DiscoveryPageStore.getNextOffset(),
            currentOffset: this.state ? this.state.currentOffset : 0,
            limit: this.state ? this.state.limit : PAGINATION_MAX,
            loadingMore: false,
            searching: false
        };
    },

    onSearchInputChange(evt) {
        this._searching = true;
        this.setState({
            queryString: evt.target.value,
            currentOffset: 0
        });
    },

    ignoreEnterKey(evt) {
        var code = evt.keyCode || evt.which;
        if (code == 13) {
            evt.preventDefault();
            return evt.stopPropagation();
        }
    },

    onCategoryChange(categories) {
        this._searching = true;
        this.setState({ categories, currentOffset: 0 });
    },

    onTypeChange(type) {
        this._searching = true;
        this.setState({ type, currentOffset: 0 });
    },

    onOrganizationChange(agency) {
        this._searching = true;
        this.setState({ agency, currentOffset: 0 });
    },

    componentDidUpdate(prevProps, prevState) {
        if (this.state.queryString !== prevState.queryString) {
            this.debounceSearch();
        }
        else if(!_.isEqual(this.state.categories, prevState.categories) ||
            !_.isEqual(this.state.type, prevState.type) ||
            !_.isEqual(this.state.agency, prevState.agency) ||
            !_.isEqual(this.state.currentOffset, prevState.currentOffset)) {
            this.search();
        }
    },

    componentWillMount() {
        this.listenTo(DiscoveryPageStore, this.onStoreChange);

        // Notice when a search is finished
        this.listenTo(ListingActions.searchCompleted, this.onSearchCompleted);

        // Reload when a new review is added
        this.listenTo(ListingActions.saveReviewCompleted, ListingActions.fetchStorefrontListings);

        // fetch data when instantiated
        ListingActions.fetchStorefrontListings();

        if(this.context.getCurrentParams().categories){
          this.setState({initCategories: decodeURIComponent(this.context.getCurrentParams().categories).split('+')});
        }

    },

    componentWillUnmount: function(){
        $(this.refs.form.getDOMNode()).unbind('submit', false);
    },

    render: function () {
        var isSearching = this.isSearching();
        var isBrowsing = this.isBrowsing();

        return (
            <div>
                <NavBar />
                <Header>
                <form id="tourstop-center-search" className="col-xs-9 col-lg-10" ref="form" role="search">
                  <div className="row">
                    <div className="form-group Search col-sm-6 col-xs-4">
                      <i className="icon-search"></i>

                      <input ref="search" type="text" className="form-control"
                        tabIndex="0"
                        placeholder="Search"
                        value={ this.state.queryString || ''}
                        onChange={ this.onSearchInputChange }
                        onKeyPress={this.onSearchTextCompleted }
                        />
                      <i className="icon-cross-14-grayDark clearButton" onClick={this.searchBarReset}></i>
                    </div>
                    <Types value={this.state.type} onChange={this.onTypeChange} />
                    <Organizations value={this.state.agency} onChange={this.onOrganizationChange} />
                  </div>
                </form>
                </Header>
                <div id="discovery" className="row">
                    <Sidebar
			ref="sidebar"
                        isSearching= { isSearching }
                        initCategories = { this.state.initCategories ? this.state.initCategories : false }
                        categories={ this.props.system.categories }
                        onGoHome= { this.reset }
                        onChange= { this.onCategoryChange } />
                    <section className="content col-xs-9 col-lg-10">
                        {
                            isBrowsing ?
                                this.renderSearchResults() :
                                [
                                    this.renderFeaturedListings(),
                                    this.renderNewArrivals(),
                                    this.renderMostPopular()
                                ]
                        }
                    </section>
                </div>
            </div>
        );
    },

    componentDidMount(){
        var substringMatcher = function(strs) {
          return function findMatches(q, cb) {
            // an array that will be populated with substring matches
            var matches = [];

            // regex used to determine if a string contains the substring `q`
            var substrRegex = new RegExp(q, 'i');

            // iterate through the pool of strings and for any string that
            // contains the substring `q`, add it to the `matches` array
            $.each(strs, function(i, str) {
              if (substrRegex.test(str)) {
                matches.push(str);
              }
            });

            cb(matches);
          };
        };

        $.get(`${API_URL}/api/metadata/`, data => {
          var listings = data.listing_titles;

          $(this.refs.search.getDOMNode()).typeahead({
            hint: true,
            highlight: true,
            minLength: 1,
          },
          {
            name: 'listings',
            source: substringMatcher(listings)
          }).on('typeahead:selected', (evt, item) => {
            this.onSearchInputChange({
              target: {
                value: item
              }
            });
          });
        });


        $(window).scroll(() => {
           if ($(window).scrollTop() + $(window).height() == $(document).height()) {
             if (!this.state.loadingMore) {
               this.handleLoadMore();
               if (this.state.nextOffset && !this._searching) {
                 this.handleMoreSearch();
               }
             }
           }
        });

        $(this.refs.form.getDOMNode()).submit((e)=>e.preventDefault());

        // If a search string is provided to us, load it into the search feild
        if(this.context.getCurrentParams().searchString){
          this._searching = true;
          this.setState({
            queryString: this.context.getCurrentParams().searchString,
            currentOffset: 0
          });
        }

        // If some categories, types, or orgs are provided, select them.
        if(this.context.getCurrentParams().categories){
          this.onCategoryChange(this.state.initCategories);
        }

        if(this.context.getCurrentParams().type){
          this.onTypeChange(decodeURIComponent(this.context.getCurrentParams().type).split('+'));
        }

        if(this.context.getCurrentParams().org){
          this.onOrganizationChange(decodeURIComponent(this.context.getCurrentParams().org).split('+'));
        }
    },


    onStoreChange() {
        this.setState(this.getInitialState());
    },

    isSearching() {
        return !!this.state.queryString;
    },

    isBrowsing() {
        return (this.isSearching() || areFiltersApplied(this.state));
    },

    reset() {
        this._searching = true;
        this.setState({
            queryString: '',
            currentOffset: 0,
            type: [],
            agency: []
        });
    },

    searchBarReset() {
	if (this.refs.search.getDOMNode().value.length > 0) {
            this._searching = true;
            this.setState({
                queryString: '',
                currentOffset: 0
            });
        }
    },

    debounceSearch: _.debounce(function () {
        this.search();
    }, 500),

    search() {
        var { type, agency } = this.state;
        var combinedObj = _.assign(
            { search: this.state.queryString,
              offset: this.state.currentOffset,
              category: this.state.categories,
              limit: this.state.limit
            },
            { type, agency });

        ListingActions.search(_.assign(combinedObj));

        this.setState({
          searching: true
        });
    },

    onSearchCompleted() {
        if(this.refs.shareResults){
          $(this.refs.shareResults.getDOMNode()).popover({
            html: true
          });
        }
        this._searching = false;
        this.setState({
            lastSearchCompleted: Date.now(),
            searching: false
        });
    },

    onSearchTextCompleted(e){
        if(e.charCode == 13){
          e.preventDefault();
          e.stopPropagation();
          $(this.refs.searchResults.getDOMNode()).attr("tabindex",-1).focus();
        }

    },

    renderFeaturedListings() {
        if(!this.state.featured.length) {
            return;
        }

        return (
            <FeaturedListings key="FeaturedListings"
                listings={ this.state.featured } />
        );
    },

    renderNewArrivals() {
        if(!this.state.newArrivals.length) {
            return;
        }

        return (
            <section className="Discovery__NewArrivals" key="Discovery__NewArrivals">
                <h4>New Arrivals</h4>
                <Carousel className="new-arrival-listings" aria-label="New Arrivals Carousel">
                    { ListingTile.fromArray(this.state.newArrivals) }
                </Carousel>
            </section>
        );
    },

    handleLoadMore() {
        if (this.isMounted()) {
          this.setState({
              mostPopularTiles: this.state.mostPopularTiles += 12
          });
        }

        if (this.state.mostPopularTiles < this.state.limit + this.state.initialMostPopularTiles) {
          if (this.isMounted()) {
            this.setState({
              loadingMore: true
            });
          }

          // Debounce loading more so event is not triggered multiple times while
          // listings are loading in.
          setTimeout(() => {
            if (this.isMounted()) {
              this.setState({
                loadingMore: false
              });
            }
          }, 500);
        }
    },
    renderMostPopular() {
        if(!this.state.mostPopular.length) {
            return;
        }

        var InfiniTiles = ListingTile.renderLimitedTiles(this.state.mostPopularTiles, this.state.mostPopular);

        return (
            <section className="Discovery__MostPopular" key="Discovery__MostPopular">
                <h4>Most Popular</h4>
                <ul className="infiniteScroll row clearfix">
                    { InfiniTiles }
                </ul>
                <p className="text-center">
                  { this.state.loadingMore &&
                    <h3 className="col-xs-12">Searching...</h3>
                  }
                </p>
            </section>
        );
    },

    handleMoreSearch() {
        this.setState({
            currentOffset: this.state.nextOffset
        });
    },

    renderSearchResults() {
        var results = '';

        if (!this._searching) {
            results = this.state.searchResults.length > 0 ?
                ListingTile.fromArray(this.state.searchResults) :
                <h3 className="col-xs-12">No results found.</h3>;
        }

        var searchLink = `${CENTER_URL}/#/home/${encodeURIComponent(this.state.queryString)}/${(this.state.categories.length) ? encodeURIComponent(this.state.categories.toString()).replace(/%2C/g,'+') : ''}/${(this.state.type.length) ? encodeURIComponent(this.state.type.toString()).replace(/%2C/g,'+') : ''}/${(this.state.agency.length) ? encodeURIComponent(this.state.agency.toString()).replace(/%2C/g,'+') : ''}`;
        return (
            <section className="Discovery__SearchResults">
                <h4 ref="searchResults">Search Results &nbsp;
                  <span tabIndex="0"
                    className="shareLink"
                    ref="shareResults"
                    data-toggle="popover"
                    title={"Share <span style='float: right' onclick=" + '$(this).parent().parent().popover("toggle")' + " class='icon-cross-14-grayDark'></span>"}
                    data-content={"Copy the URL and paste it anywhere to share. <br /><input class='shareResults' onclick='" + '$(this).focus();$(this).select();' + "' style='width: 100%' type='text' value=" + searchLink + "></input>"}>Share
                    &nbsp;<span className="icon-share-10-blueDark"></span>
                  </span>
                </h4>
                <p><DetailedQuery
                  onCategoryChange={this.onCategoryChange}
                  onTypeChange={this.onTypeChange}
                  onOrganizationChange={this.onOrganizationChange}
                  reset={this.reset}
                  data={this.state}
                  /></p>
                <ul className="list-unstyled listings-search-results row clearfix">
                    { results }
                </ul>
                <div className="list-unstyled listings-search-results row clearfix">
                    { this.state.searching &&
                      <h3 className="col-xs-12">Searching...</h3>
                    }
                </div>
            </section>
        );
    }

});

module.exports = Discovery;
