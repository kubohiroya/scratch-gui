import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import VM from 'scratch-vm';

import Box from '../box/box.jsx';
import {STAGE_DISPLAY_SIZES} from '../../lib/layout-constants.js';
import StageHeader from '../../containers/stage-header.jsx';
import Stage from '../../containers/stage.jsx';
import Loader from '../loader/loader.jsx';

import styles from './stage-wrapper.css';

const StageWrapperComponent = function (props) {
    const {
        isEmbedded,
        isFullScreen,
        isRtl,
        isRendererSupported,
        loading,
        stageAspect,
        stageDefaultWidth,
        stageDisplayWidth,
        stagePanel: StagePanel,
        stageSize,
        stageTools,
        onStagePreset,
        vm
    } = props;

    const renderStage = (width, floating, inputDocument) => isRendererSupported ? <Stage
        refreshInputBounds={floating}
        stageInputDocument={inputDocument}
        stageDisplayWidth={width}
        stageSize={stageSize}
        vm={vm}
    /> : null;

    return (
        <Box
            className={classNames(
                styles.stageWrapper,
                {
                    [styles.embedded]: isEmbedded,
                    [styles.fullScreen]: isFullScreen,
                    [styles.loading]: loading,
                    [styles.offsetControls]: !(isEmbedded || isFullScreen)
                }
            )}
            dir={isRtl ? 'rtl' : 'ltr'}
        >
            <Box className={styles.stageMenuWrapper}>
                <StageHeader
                    stageDisplayWidth={stageDisplayWidth}
                    stageSize={stageSize}
                    stageTools={stageTools}
                    vm={vm}
                    onStagePreset={onStagePreset}
                />
            </Box>
            <Box className={styles.stageCanvasWrapper}>
                {StagePanel && isRendererSupported ? <StagePanel
                    aspect={stageAspect}
                    defaultWidth={stageDefaultWidth}
                    render={renderStage}
                    width={stageDisplayWidth}
                /> : renderStage(stageDisplayWidth)}
            </Box>
            {loading ? (
                <Loader isFullScreen={isFullScreen} />
            ) : null}
        </Box>
    );
};

StageWrapperComponent.propTypes = {
    isEmbedded: PropTypes.bool,
    isFullScreen: PropTypes.bool,
    isRendererSupported: PropTypes.bool.isRequired,
    isRtl: PropTypes.bool.isRequired,
    loading: PropTypes.bool,
    stageAspect: PropTypes.number,
    stageDefaultWidth: PropTypes.number,
    stageDisplayWidth: PropTypes.number,
    stagePanel: PropTypes.elementType,
    stageTools: PropTypes.node,
    onStagePreset: PropTypes.func,
    stageSize: PropTypes.oneOf(Object.keys(STAGE_DISPLAY_SIZES)).isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default StageWrapperComponent;
