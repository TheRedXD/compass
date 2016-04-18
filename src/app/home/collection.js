var View = require('ampersand-view');
var CollectionStatsView = require('../collection-stats');
var DocumentView = require('../documents');
var SchemaView = require('../schema');
var IndexView = require('../indexes');
var RefineBarView = require('../refine-view');
var MongoDBCollection = require('../models/mongodb-collection');
var _ = require('lodash');

var app = require('ampersand-app');
var metrics = require('mongodb-js-metrics')();
var debug = require('debug')('mongodb-compass:home:collection');

var collectionTemplate = require('./collection.jade');

var MongoDBCollectionView = View.extend({
  // modelType: 'Collection',
  template: collectionTemplate,
  props: {
    visible: {
      type: 'boolean',
      default: false
    },
    viewSwitcher: 'object',
    activeView: {
      type: 'string',
      required: true,
      default: 'documentView',
      values: ['documentView', 'schemaView', 'explainView', 'indexView']
    },
    ns: 'string'
  },
  events: {
    'click ul.nav li a': 'onTabClicked'
  },
  bindings: {
    visible: {
      type: 'booleanClass',
      no: 'hidden'
    },
    'model._id': {
      hook: 'name'
    },
    activeView: {
      type: 'switchClass',
      'name': 'active',
      cases: {
        'documentView': '[data-hook=document-tab]',
        'schemaView': '[data-hook=schema-tab]',
        'explainView': '[data-hook=explain-tab]',
        'indexView': '[data-hook=index-tab]'
      }
    }
  },
  subviews: {
    statsView: {
      hook: 'stats-subview',
      waitFor: 'ns',
      prepareView: function(el) {
        return new CollectionStatsView({
          el: el,
          parent: this,
          model: this.model
        });
      }
    },
    documentView: {
      hook: 'document-subview',
      prepareView: function(el) {
        return new DocumentView({
          el: el,
          parent: this,
          model: this.model
        });
      }
    },
    schemaView: {
      hook: 'schema-subview',
      prepareView: function(el) {
        return new SchemaView({
          el: el,
          parent: this,
          model: this.model
        });
      }
    },
    indexView: {
      hook: 'index-subview',
      prepareView: function(el) {
        return new IndexView({
          el: el,
          parent: this,
          model: this.model
        });
      }
    },
    refineBarView: {
      hook: 'refine-bar-subview',
      prepareView: function(el) {
        var view = new RefineBarView({
          el: el,
          parent: this,
          queryOptions: app.queryOptions,
          volatileQueryOptions: app.volatileQueryOptions
        });
        view.on('submit', function() {
          this.trigger('submit:query');
        }.bind(this));
        return view;
      }
    }
  },
  initialize: function() {
    debug('collection view', this);
    this.model = new MongoDBCollection();
    this.listenToAndRun(this.parent, 'change:ns', this.onCollectionChanged.bind(this));
  },
  onTabClicked: function(e) {
    e.preventDefault();
    e.stopPropagation();

    // map tab label to correct view and switch views
    var tabToViewMap = {
      'Documents': 'documentView',
      'Schema': 'schemaView',
      'Explain Plan': 'explainView',
      'Indexes': 'indexView'
    };
    this.switchViews(tabToViewMap[e.target.innerText]);
  },
  switchViews: function(view) {
    // disable all views but the active one
    _.each(this._subviews, function(subview) {
      subview.visible = false;
    });
    if (this[view]) {
      this[view].visible = true;
    }
    this.activeView = view;
  },
  onCollectionChanged: function() {
    this.ns = this.parent.ns;
    if (!this.ns) {
      this.visible = false;
      debug('No active collection namespace so no schema has been requested yet.');
      return;
    }
    this.visible = true;
    this.model._id = this.ns;
    this.model.once('sync', this.onCollectionFetched.bind(this));
    this.model.fetch();
  },
  onCollectionFetched: function(model) {
    this.switchViews(this.activeView);
    // track collection information
    var metadata = _.omit(model.serialize(), ['_id', 'database',
      'index_details', 'wired_tiger']);
    metadata.specialish = model.specialish;
    metadata['database name length'] = model.database.length;
    metadata['collection name length'] = model.getId().length -
      model.database.length - 1;
    metrics.track('Collection', 'fetched', metadata);
  }
});

module.exports = MongoDBCollectionView;
