import PropTypes from 'prop-types';
import React from 'react';
import {injectIntl, intlShape} from 'react-intl';
import {BlockEditorDialog} from '@kubohiroya/turbowarp-block-editor/react';
import styles from '@kubohiroya/turbowarp-block-editor/react/styles.css';
import Modal from './modal.jsx';
import log from '../lib/log.js';
import theme from '../components/block-editor/block-editor.css';

const reportError = error => log.error(error);

const BlockEditorModal = props => {
    const messages = {
        title: props.intl.formatMessage({
            id: 'tw.blockEditor.title', defaultMessage: 'Edit block', description: 'Block editor dialog title'
        }),
        saving: props.intl.formatMessage({
            id: 'tw.blockEditor.saving', defaultMessage: 'Saving…', description: 'Block editor save is pending'
        }),
        cancel: props.intl.formatMessage({
            id: 'tw.blockEditor.cancel', defaultMessage: 'Cancel', description: 'Cancel block editing'
        }),
        save: props.intl.formatMessage({
            id: 'tw.blockEditor.save', defaultMessage: 'Save', description: 'Save block editing'
        }),
        saveAll: props.intl.formatMessage({
            id: 'tw.blockEditor.saveAll', defaultMessage: 'Save all', description: 'Save all block forms'
        }),
        structureError: props.intl.formatMessage({
            id: 'tw.blockEditor.structureError',
            defaultMessage: 'This hierarchy is invalid or exceeds 500 blocks or 32 levels. No blocks were saved.',
            description: 'A hierarchy cannot be opened safely'
        }),
        conflict: props.intl.formatMessage({
            id: 'tw.blockEditor.conflict',
            defaultMessage: 'This block changed. Close this dialog and open it again.',
            description: 'Block editor conflict message'
        }),
        failed: props.intl.formatMessage({
            id: 'tw.blockEditor.failed',
            defaultMessage: 'The block could not be edited. Close this dialog and try again.',
            description: 'Block editor failure message'
        }),
        structuralNode: props.intl.formatMessage({
            id: 'tw.blockEditor.structuralNode',
            defaultMessage: 'No form for this block; its nested blocks are included.',
            description: 'An intermediate structural block without an editor'
        })
    };
    return (<BlockEditorDialog
        className={theme.theme}
        messages={messages}
        ModalComponent={Modal}
        nodeAppearances={props.nodeAppearances}
        nodeLabels={props.nodeLabels}
        onClose={props.onClose}
        onError={reportError}
        session={props.session}
        styles={styles}
    />);
};

BlockEditorModal.propTypes = {
    nodeAppearances: PropTypes.object,
    nodeLabels: PropTypes.object,
    intl: intlShape,
    onClose: PropTypes.func.isRequired,
    session: PropTypes.object.isRequired
};

export {BlockEditorModal};
export default injectIntl(BlockEditorModal);
