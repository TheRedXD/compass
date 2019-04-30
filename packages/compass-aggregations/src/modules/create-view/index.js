const debug = require('debug')('mongodb-aggregations:modules:create-view:index');

import { combineReducers } from 'redux';
import dataService from 'modules/data-service';

import source, {
  INITIAL_STATE as SOURCE_INITIAL_STATE
} from 'modules/create-view/source';

import pipeline, {
  INITIAL_STATE as PIPELINE_INITIAL_STATE
} from 'modules/create-view/pipeline';

import isRunning, {
  toggleIsRunning,
  INITIAL_STATE as IS_RUNNING_INITIAL_STATE
} from 'modules/create-view/is-running';
import isVisible, {
  INITIAL_STATE as IS_VISIBLE_INITIAL_STATE
} from 'modules/create-view/is-visible';
import name, {
  INITIAL_STATE as NAME_INITIAL_STATE
} from 'modules/create-view/name';

import error, {
  clearError,
  handleError,
  INITIAL_STATE as ERROR_INITIAL_STATE
} from 'modules/create-view/error';

import { reset, RESET } from 'modules/create-view/reset';

const parseNs = require('mongodb-ns');

/**
 * Open action name.
 */
const OPEN = 'aggregations/create-view/OPEN';

export const INITIAL_STATE = {
  isRunning: IS_RUNNING_INITIAL_STATE,
  isVisible: IS_VISIBLE_INITIAL_STATE,
  name: NAME_INITIAL_STATE,
  error: ERROR_INITIAL_STATE,
  source: SOURCE_INITIAL_STATE,
  pipeline: PIPELINE_INITIAL_STATE
};

/**
 * The main reducer.
 */
const reducer = combineReducers({
  isRunning,
  isVisible,
  name,
  error,
  source,
  pipeline,
  dataService
});

/**
 * The root reducer.
 *
 * @param {Object} state - The state.
 * @param {Object} action - The action.
 *
 * @returns {Object} The new state.
 */
const rootReducer = (state, action) => {
  if (action.type === RESET) {
    return {
      ...state,
      ...INITIAL_STATE
    };
  } else if (action.type === OPEN) {
    const newState = {
      ...state,
      ...INITIAL_STATE,
      isVisible: true,
      source: action.source,
      pipeline: action.pipeline
    };

    debug('handling open', { newState });

    return newState;
  }
  return reducer(state, action);
};

export default rootReducer;

/**
 * Stop progress and set the error.
 *
 * @param {Function} dispatch - The dispatch function.
 * @param {Error} err - The error.
 *
 * @return {Object} The result.
 */
const stopWithError = (dispatch, err) => {
  dispatch(toggleIsRunning(false));
  return dispatch(handleError(err));
};

/**
 * Open create view action creator.
 *
 * @param {String} sourceNs - The source namespace for the view.
 * @param {Array} sourcePipeline - The pipeline to use for the view.
 * @returns {Object} The action.
 */
export const open = (sourceNs, sourcePipeline) => ({
  type: OPEN,
  source: sourceNs,
  pipeline: sourcePipeline
});

/**
 * The create view action.
 *
 * @returns {Function} The thunk function.
 */
export const createView = () => {
  return (dispatch, getState) => {
    debug('creating view!');
    const state = getState();
    const ds = state.dataService.dataService;

    const viewName = state.name;
    const viewSource = state.source;
    const { database } = parseNs(state.source);
    const viewPipeline = state.pipeline;
    const options = {};

    dispatch(clearError());

    try {
      dispatch(toggleIsRunning(true));
      debug('calling data-service.createView', viewName, viewSource, viewPipeline, options);
      ds.createView(viewName, viewSource, viewPipeline, options, (e) => {
        if (e) {
          debug('error creating view', e);
          return stopWithError(dispatch, e);
        }
        global.hadronApp.appRegistry.emit('refresh-data');

        global.hadronApp.appRegistry.emit(
          'open-namespace-in-new-tab',
          `${database}.${viewName}`,
          true
        );
        debug('View created!');
        dispatch(reset());
      });
    } catch (e) {
      debug('Unexpected error creating view', e);
      return stopWithError(dispatch, e);
    }
  };
};
