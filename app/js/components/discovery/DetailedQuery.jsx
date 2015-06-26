'use strict';

var React = require('react');

var DetailedQuery = React.createClass({

    removeQueryString: function(){
        this.props.me.reset();
    },

    getQueryString: function(){
      if(this.props.data.queryString){
        return (
          <span>
            for listings matching &nbsp;
            { this.props.data.queryString &&
               <span className="label label-primary">
                 <i className="icon-cross-14-white" onClick={this.removeQueryString}></i>
                 {this.props.data.queryString}
               </span>
            }
          </span>
        );
      }
    },

    removeType: function(type){
      this.props.me.setState({
        categories: []
      });
    },

    getTypes: function(){
      if(this.props.data.type.length){
        var prettyTypes = this.props.data.type.map(function(type){
          return (
            <span className="label label-primary">
              <i className="icon-cross-14-white" onClick={this.removeType(type)}></i>
              {type}
            </span>
          );
        });
        return (
          <span>
            &nbsp;with the {(this.props.data.type.length > 1) ? 'types' : 'type'} {prettyTypes}
          </span>
        );
      }else{
        return false;
      }
    },

    removeOrg: function(org){
      this.props.me.setState({
        agency: []
      });
    },

    getOrgs: function(){
      if(this.props.data.agency.length){
        var prettyOrgs = this.props.data.agency.map((agent)=>{
          return (
            <span className="label label-primary">
              <i className="icon-cross-14-white" onClick={this.removeOrg(agent)}></i>
              {agent}
            </span>
          );
        });
        return (
          <span>
            &nbsp;in the {(this.props.data.agency.length > 1) ? 'orginizations' : 'orginization'} {prettyOrgs}
          </span>
        );
      }else{
        return false;
      }
    },

    removeCategory: function(cat){

    },

    getCategories: function(){
      if(this.props.data.categories.length){
        var prettyCats;
        if(this.props.data.categories.length > 1){
          prettyCats = this.props.data.categories.map((cat, i)=>{
            return (
              <span>
                <span className="label label-primary">
                  <i className="icon-cross-14-white" onClick={this.removeCategory(cat)}></i>
                  {cat}
                </span>
                {(i !== this.props.data.categories.length -1) &&
                  <span>&nbsp;and&nbsp;</span>
                }
              </span>
            );
          });
        }else{
          prettyCats = this.props.data.categories.map((cat)=>{
            return (
              <span className="label label-primary">
                <i className="icon-cross-14-white" onClick={this.removeCategory(cat)}></i>
                {cat}
              </span>
            );
          });
        }
        return (
          <span>
            &nbsp;with the {(this.props.data.categories.length > 1) ? 'categories' : 'category'} {prettyCats}
          </span>
        );
      }else{
        return false;
      }
    },

    render() {

        return (
          <div>
            {this.getQueryString()}
            {this.getTypes()}
            {this.getOrgs()}
            {this.getCategories()}
          </div>
        );
    }

});

module.exports = DetailedQuery;
