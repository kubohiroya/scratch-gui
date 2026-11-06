import React, {useCallback, useLayoutEffect, useRef} from 'react';
import PropTypes from 'prop-types';

import Box from '../box/box.jsx';
import SortableSelector, {Selector} from './selector.jsx';
import styles from './asset-panel.css';

const noop = () => {};

const AssetPanel = props => {
    const {assetSelection, readOnly, scrollTop, children, ...selectorProps} = props;
    const list = useRef(null);
    useLayoutEffect(() => {
        const position = readOnly ? scrollTop : assetSelection?.getScrollTop?.();
        if (typeof position === 'number' && list.current) list.current.scrollTop = position;
    }, [assetSelection, readOnly, scrollTop]);
    useLayoutEffect(() => {
        if (!assetSelection?.rememberLayout) return;
        const {isRtl, listActions} = props;
        const buttons = props.buttons.map(({title, img}) => ({title, img, onClick: noop}));
        const previousItems = new Map(props.items.map(({dragPayload, url, details}) => [dragPayload, {url, details}]));
        assetSelection.rememberLayout((items, selectedItemIndex, detail, position) => (
            <AssetPanel
                readOnly
                scrollTop={position}
                buttons={buttons}
                isRtl={isRtl}
                items={items.map(item => ({
                    name: item.name,
                    url: item.imageUrl || previousItems.get(item.asset)?.url,
                    details: previousItems.get(item.asset)?.details
                }))}
                listActions={listActions}
                selectedItemIndex={selectedItemIndex}
                onItemClick={noop}
            >{detail}</AssetPanel>
        ));
    }, [assetSelection, props]);
    const setList = useCallback(node => {
        list.current = node;
    }, []);
    const saveScroll = useCallback(event => {
        assetSelection?.rememberScrollTop?.(event.currentTarget.scrollTop);
    }, [assetSelection]);
    const selector = readOnly ? (
        <Selector
            className={styles.selector}
            {...selectorProps}
            draggingType={null}
            listRef={setList}
            onAddSortable={noop}
            onRemoveSortable={noop}
        />
    ) : (
        <SortableSelector
            className={styles.selector}
            {...selectorProps}
            listRef={assetSelection ? setList : null}
            onListScroll={assetSelection?.rememberScrollTop ? saveScroll : null}
        />
    );
    const usesHostedLayout = readOnly || assetSelection?.rememberLayout;
    return (
        <Box
            className={styles.wrapper}
            data-layout-asset-panel={usesHostedLayout ? '' : null}
        >
            {readOnly ? <div
                inert=""
                style={{display: 'contents'}}
            >{selector}</div> : selector}
            <Box
                className={styles.detailArea}
                data-layout-asset-detail={usesHostedLayout ? '' : null}
            >
                {children}
            </Box>
        </Box>
    );
};

AssetPanel.propTypes = {
    ...Selector.propTypes,
    assetSelection: PropTypes.shape({
        rememberLayout: PropTypes.func,
        getScrollTop: PropTypes.func,
        rememberScrollTop: PropTypes.func
    }),
    children: PropTypes.node,
    readOnly: PropTypes.bool,
    scrollTop: PropTypes.number
};

export default AssetPanel;
