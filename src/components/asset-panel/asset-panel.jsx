import React from 'react';
import PropTypes from 'prop-types';

import Box from '../box/box.jsx';
import SortableSelector, {Selector} from './selector.jsx';
import styles from './asset-panel.css';

const renderNativeSelector = (Component, props) => <Component {...props} />;

const renderPanel = ({children, ...props}, {
    panelAttributes, detailAttributes, renderSelector = renderNativeSelector
} = {}) => (
    <Box
        className={styles.wrapper}
        {...panelAttributes}
    >
        {renderSelector(SortableSelector, {className: styles.selector, ...props})}
        <Box
            className={styles.detailArea}
            {...detailAttributes}
        >
            {children}
        </Box>
    </Box>
);

const AssetPanel = ({assetSelection, ...props}) =>
    assetSelection?.renderPanel?.(renderPanel, Selector, props) ?? renderPanel(props);

AssetPanel.propTypes = {
    ...Selector.propTypes,
    assetSelection: PropTypes.shape({renderPanel: PropTypes.func}),
    children: PropTypes.node
};

export default AssetPanel;
